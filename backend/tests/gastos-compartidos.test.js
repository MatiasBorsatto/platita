const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Grupo, MiembroGrupo, Movimiento, ParticipacionGasto } = require('../src/db/models');

const app = createApp();
const sufijo = Date.now();
const correos = ['a', 'b', 'c', 'x'].map((x) => `compartidos-${x}-${sufijo}@example.com`);
const password = 'clave-segura-1';
let agentA, agentB, agentC, agentX;
let ids = {};
let grupoId;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

beforeAll(async () => {
  agentA = await sesion(correos[0], 'Ana');
  agentB = await sesion(correos[1], 'Bruno');
  agentC = await sesion(correos[2], 'Carla');
  agentX = await sesion(correos[3], 'Xavi');
  const us = await Usuario.findAll({ where: { email: correos } });
  const porEmail = Object.fromEntries(us.map((u) => [u.email, u.id]));
  ids = { a: porEmail[correos[0]], b: porEmail[correos[1]], c: porEmail[correos[2]], x: porEmail[correos[3]] };
  const g = await Grupo.create({ nombre: 'Casa', codigo: `C${String(sufijo).slice(-7)}`, creadoPor: ids.a });
  grupoId = g.id;
  await MiembroGrupo.bulkCreate([
    { grupoId, usuarioId: ids.a, rol: 'admin' },
    { grupoId, usuarioId: ids.b, rol: 'miembro' },
    { grupoId, usuarioId: ids.c, rol: 'miembro' },
  ]);
});

afterAll(async () => {
  const movs = await Movimiento.findAll({ where: { grupoId } });
  await ParticipacionGasto.destroy({ where: { movimientoId: movs.map((m) => m.id) } });
  await Movimiento.destroy({ where: { grupoId } });
  await MiembroGrupo.destroy({ where: { grupoId } });
  await Grupo.destroy({ where: { id: grupoId } });
  await Usuario.destroy({ where: { email: correos } });
  await sequelize.close();
});

const url = () => `/api/grupos/${grupoId}/gastos`;
const base = () => ({ pagadorId: ids.a, monto: '100.00', fecha: '2026-10-01', descripcion: 'Super' });

describe('gastos compartidos', () => {
  test('$100 entre 3 miembros se reparte 33.34, 33.33, 33.33', async () => {
    const res = await agentA.post(url()).send(base());
    expect(res.status).toBe(201);
    expect(res.body.alcance).toBe('compartido');
    expect(res.body.pagadorId).toBe(ids.a);
    expect(res.body.grupoId).toBe(grupoId);
    const montos = res.body.participaciones.map((p) => p.monto).sort().reverse();
    expect(montos).toEqual(['33.34', '33.33', '33.33']);
    const filas = await ParticipacionGasto.findAll({ where: { movimientoId: res.body.id } });
    expect(filas).toHaveLength(3);
  });

  test('participaciones personalizadas que suman el total se guardan', async () => {
    const res = await agentA.post(url()).send({
      ...base(),
      participantes: [
        { usuarioId: ids.a, monto: '70.00' },
        { usuarioId: ids.b, monto: '30.00' },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.participaciones).toHaveLength(2);
  });

  test('participaciones personalizadas que no suman el total responden 400', async () => {
    const res = await agentA.post(url()).send({
      ...base(),
      participantes: [
        { usuarioId: ids.a, monto: '70.00' },
        { usuarioId: ids.b, monto: '20.00' },
      ],
    });
    expect(res.status).toBe(400);
  });

  test('participante que no es miembro responde 400', async () => {
    const res = await agentA.post(url()).send({
      ...base(),
      participantes: [
        { usuarioId: ids.a, monto: '50.00' },
        { usuarioId: ids.x, monto: '50.00' },
      ],
    });
    expect(res.status).toBe(400);
  });

  test('pagador que no es miembro responde 400', async () => {
    const res = await agentA.post(url()).send({ ...base(), pagadorId: ids.x });
    expect(res.status).toBe(400);
  });

  test('participante repetido responde 400', async () => {
    const res = await agentA.post(url()).send({
      ...base(),
      participantes: [
        { usuarioId: ids.a, monto: '50.00' },
        { usuarioId: ids.a, monto: '50.00' },
      ],
    });
    expect(res.status).toBe(400);
  });

  test('usuario que no es miembro del grupo recibe 404', async () => {
    const res = await agentX.post(url()).send({ ...base(), pagadorId: ids.x });
    expect(res.status).toBe(404);
  });

  test('no deja movimientos huérfanos si falla', async () => {
    const antes = await Movimiento.count({ where: { grupoId } });
    await agentA.post(url()).send({ ...base(), participantes: [{ usuarioId: ids.x, monto: '100.00' }] });
    expect(await Movimiento.count({ where: { grupoId } })).toBe(antes);
  });

  describe('aislamiento respecto a los endpoints personales', () => {
    test('PATCH y DELETE de un gasto compartido responden 404; la lista personal no lo incluye', async () => {
      const comp = (await agentA.post(url()).send(base())).body;
      const pers = await agentA
        .post('/api/movimientos')
        .send({ tipo: 'gasto', monto: '5.00', fecha: '2026-10-02', descripcion: 'cafe' });
      expect(pers.status).toBe(201);

      expect((await agentA.patch('/api/movimientos/' + comp.id).send({ monto: '1.00' })).status).toBe(404);
      expect((await agentA.delete('/api/movimientos/' + comp.id)).status).toBe(404);
      expect(await Movimiento.count({ where: { id: comp.id } })).toBe(1);

      const lista = await agentA.get('/api/movimientos?limit=100');
      const idsLista = lista.body.items.map((m) => m.id);
      expect(idsLista).not.toContain(comp.id);
      expect(idsLista).toContain(pers.body.id);

      const edit = await agentA.patch('/api/movimientos/' + pers.body.id).send({ monto: '6.00' });
      expect(edit.status).toBe(200);
      expect(edit.body.monto).toBe('6.00');
    });
  });
});
