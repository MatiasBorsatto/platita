const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Grupo, MiembroGrupo, Movimiento, ParticipacionGasto, Categoria } = require('../src/db/models');

const app = createApp();
const sufijo = Date.now();
const correos = ['a', 'b', 'c', 'x'].map((x) => `edicion-${x}-${sufijo}@example.com`);
const password = 'clave-segura-1';
let agentA, agentB, agentX;
let ids = {};
let grupoId;
let catPropiaB;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

beforeAll(async () => {
  agentA = await sesion(correos[0], 'Ana');
  agentB = await sesion(correos[1], 'Bruno');
  await sesion(correos[2], 'Carla');
  agentX = await sesion(correos[3], 'Xavi');
  const us = await Usuario.findAll({ where: { email: correos } });
  const porEmail = Object.fromEntries(us.map((u) => [u.email, u.id]));
  ids = { a: porEmail[correos[0]], b: porEmail[correos[1]], c: porEmail[correos[2]], x: porEmail[correos[3]] };
  const g = await Grupo.create({ nombre: 'Casa', codigo: `E${String(sufijo).slice(-7)}`, creadoPor: ids.a });
  grupoId = g.id;
  await MiembroGrupo.bulkCreate([
    { grupoId, usuarioId: ids.a, rol: 'admin' },
    { grupoId, usuarioId: ids.b, rol: 'miembro' },
    { grupoId, usuarioId: ids.c, rol: 'miembro' },
  ]);
  catPropiaB = await Categoria.create({ nombre: `Propia B ${sufijo}`, usuarioId: ids.b, tipo: 'gasto' });
});

afterAll(async () => {
  const movs = await Movimiento.findAll({ where: { usuarioId: [ids.a, ids.x] } });
  await ParticipacionGasto.destroy({ where: { movimientoId: movs.map((m) => m.id) } });
  await Movimiento.destroy({ where: { usuarioId: [ids.a, ids.x] } });
  await MiembroGrupo.destroy({ where: { grupoId } });
  await Grupo.destroy({ where: { id: grupoId } });
  await Categoria.destroy({ where: { usuarioId: ids.b } });
  await Usuario.destroy({ where: { email: correos } });
  await sequelize.close();
});

const url = () => `/api/grupos/${grupoId}/gastos`;
const base = () => ({ pagadorId: ids.a, monto: '100.00', fecha: '2026-10-01', descripcion: 'Super' });
const crear = async (extra = {}) => (await agentA.post(url()).send({ ...base(), ...extra })).body;

async function sumaSaldos() {
  const res = await agentA.get(`/api/grupos/${grupoId}/saldos`);
  expect(res.status).toBe(200);
  const lista = Array.isArray(res.body) ? res.body : res.body.saldos;
  return lista.reduce((acc, s) => acc + Math.round(Number(s.saldo) * 100), 0);
}

describe('listar gastos compartidos', () => {
  test('lista los gastos del grupo, el más nuevo primero, con participaciones', async () => {
    const viejo = await crear({ fecha: '2026-01-05', descripcion: 'Viejo' });
    const nuevo = await crear({ fecha: '2026-12-05', descripcion: 'Nuevo' });
    const res = await agentB.get(url());
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
    const idsLista = res.body.items.map((i) => i.id);
    expect(idsLista.indexOf(nuevo.id)).toBeLessThan(idsLista.indexOf(viejo.id));
    const item = res.body.items.find((i) => i.id === nuevo.id);
    expect(item).toMatchObject({
      fecha: '2026-12-05',
      descripcion: 'Nuevo',
      monto: '100.00',
      pagadorId: ids.a,
      usuarioId: ids.a,
    });
    expect(item).toHaveProperty('categoriaId');
    expect(item.participaciones).toHaveLength(3);
    expect(item.participaciones[0]).toHaveProperty('categoriaId');
    expect(typeof item.participaciones[0].monto).toBe('string');
  });

  test('limit se acota a 100 y un no miembro recibe 404', async () => {
    const res = await agentA.get(`${url()}?limit=500`);
    expect(res.body.limit).toBe(100);
    expect((await agentX.get(url())).status).toBe(404);
  });

  test('no incluye gastos personales', async () => {
    const personal = (await agentA.post('/api/movimientos').send({ tipo: 'gasto', monto: '5.00', fecha: '2026-10-01' })).body;
    const res = await agentA.get(url());
    expect(res.body.items.map((i) => i.id)).not.toContain(personal.id);
  });
});

describe('editar gasto compartido', () => {
  test('el creador edita y se re-divide en partes iguales', async () => {
    const g = await crear();
    const res = await agentA.patch(`${url()}/${g.id}`).send({ monto: '100.01', descripcion: 'Editado' });
    expect(res.status).toBe(200);
    expect(res.body.monto).toBe('100.01');
    expect(res.body.descripcion).toBe('Editado');
    const montos = res.body.participaciones.map((p) => p.monto).sort();
    expect(montos).toEqual(['33.33', '33.34', '33.34']);
    const filas = await ParticipacionGasto.findAll({ where: { movimientoId: g.id } });
    expect(filas).toHaveLength(3);
    expect(await sumaSaldos()).toBe(0);
  });

  test('con participantes explícitos y categoría propia por participante', async () => {
    const g = await crear();
    const res = await agentA.patch(`${url()}/${g.id}`).send({
      pagadorId: ids.b,
      monto: '90.00',
      participantes: [
        { usuarioId: ids.a, monto: '60.00' },
        { usuarioId: ids.b, monto: '30.00', categoriaId: catPropiaB.id },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.pagadorId).toBe(ids.b);
    expect(res.body.participaciones).toHaveLength(2);
    const pb = res.body.participaciones.find((p) => p.usuarioId === ids.b);
    expect(pb.categoriaId).toBe(catPropiaB.id);
    expect(await sumaSaldos()).toBe(0);
  });

  test('hereda la categoría base del gasto en cada participación', async () => {
    const cat = await Categoria.findOne({ where: { usuarioId: null } });
    const g = await crear();
    const res = await agentA.patch(`${url()}/${g.id}`).send({ categoriaId: cat.id });
    expect(res.status).toBe(200);
    expect(res.body.categoriaId).toBe(cat.id);
    expect(res.body.participaciones.every((p) => p.categoriaId === cat.id)).toBe(true);
  });

  test('suma distinta del monto o participante ajeno responden 400', async () => {
    const g = await crear();
    const malaSuma = await agentA.patch(`${url()}/${g.id}`).send({
      participantes: [
        { usuarioId: ids.a, monto: '10.00' },
        { usuarioId: ids.b, monto: '10.00' },
      ],
    });
    expect(malaSuma.status).toBe(400);
    const ajeno = await agentA.patch(`${url()}/${g.id}`).send({
      participantes: [
        { usuarioId: ids.a, monto: '50.00' },
        { usuarioId: ids.x, monto: '50.00' },
      ],
    });
    expect(ajeno.status).toBe(400);
    const filas = await ParticipacionGasto.findAll({ where: { movimientoId: g.id } });
    expect(filas).toHaveLength(3);
  });

  test('valida monto, descripción y fecha', async () => {
    const g = await crear();
    const malos = [{ monto: '0' }, { monto: '10.005' }, { descripcion: 'x'.repeat(201) }, { fecha: '2026-02-31' }];
    for (const body of malos) {
      expect((await agentA.patch(`${url()}/${g.id}`).send(body)).status).toBe(400);
    }
  });

  test('un miembro que no es el creador recibe 403', async () => {
    const g = await crear();
    const res = await agentB.patch(`${url()}/${g.id}`).send({ descripcion: 'Hack' });
    expect(res.status).toBe(403);
    expect((await Movimiento.findByPk(g.id)).descripcion).toBe('Super');
  });

  test('un no miembro recibe 404', async () => {
    const g = await crear();
    expect((await agentX.patch(`${url()}/${g.id}`).send({ descripcion: 'Hack' })).status).toBe(404);
  });

  test('un movimiento que no es gasto compartido del grupo responde 404', async () => {
    const personal = (await agentA.post('/api/movimientos').send({ tipo: 'gasto', monto: '5.00', fecha: '2026-10-01' })).body;
    expect((await agentA.patch(`${url()}/${personal.id}`).send({ descripcion: 'x' })).status).toBe(404);
    expect((await agentA.delete(`${url()}/${personal.id}`)).status).toBe(404);
    expect((await agentA.patch(`${url()}/no-es-uuid`).send({ descripcion: 'x' })).status).toBe(404);
  });
});

describe('eliminar gasto compartido', () => {
  test('el creador elimina; las participaciones se borran y los saldos quedan en cero', async () => {
    const g = await crear();
    const res = await agentA.delete(`${url()}/${g.id}`);
    expect(res.status).toBe(204);
    expect(await Movimiento.findByPk(g.id)).toBeNull();
    expect(await ParticipacionGasto.count({ where: { movimientoId: g.id } })).toBe(0);
    expect(await sumaSaldos()).toBe(0);
  });

  test('otro miembro recibe 403 y un no miembro 404', async () => {
    const g = await crear();
    expect((await agentB.delete(`${url()}/${g.id}`)).status).toBe(403);
    expect((await agentX.delete(`${url()}/${g.id}`)).status).toBe(404);
    expect(await Movimiento.findByPk(g.id)).not.toBeNull();
  });
});

describe('endpoints personales siguen rechazando gastos compartidos', () => {
  test('PATCH y DELETE /api/movimientos/:id responden 404', async () => {
    const g = await crear();
    expect((await agentA.patch(`/api/movimientos/${g.id}`).send({ descripcion: 'x' })).status).toBe(404);
    expect((await agentA.delete(`/api/movimientos/${g.id}`)).status).toBe(404);
  });
});
