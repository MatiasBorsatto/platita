const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Grupo, MiembroGrupo, Categoria, Movimiento, ParticipacionGasto, Presupuesto } = require('../src/db/models');

const app = createApp();
const sufijo = Date.now();
const correos = ['a', 'b'].map((x) => `presc-${x}-${sufijo}@example.com`);
const password = 'clave-segura-1';
let agentA;
let agentB;
let ids;
const grupos = [];
let catComida;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

beforeAll(async () => {
  agentA = await sesion(correos[0], 'Ana');
  agentB = await sesion(correos[1], 'Bruno');
  const us = await Usuario.findAll({ where: { email: correos } });
  const porEmail = Object.fromEntries(us.map((u) => [u.email, u.id]));
  ids = { a: porEmail[correos[0]], b: porEmail[correos[1]] };
  catComida = (await agentA.post('/api/categorias').send({ nombre: 'Comida' })).body.id;
  for (const n of [1, 2]) {
    const g = await Grupo.create({ nombre: `G${n}`, codigo: `P${n}${String(sufijo).slice(-6)}`, creadoPor: ids.a });
    grupos.push(g.id);
    await MiembroGrupo.bulkCreate([
      { grupoId: g.id, usuarioId: ids.a, rol: 'admin' },
      { grupoId: g.id, usuarioId: ids.b, rol: 'miembro' },
    ]);
  }
  // Personal 100.00; compartidos de 50.00 y 30.00 en dos grupos (mitad c/u); uno fuera de mes.
  await agentA.post('/api/movimientos').send({ tipo: 'gasto', monto: '100.00', fecha: '2026-10-02', categoriaId: catComida });
  await compartido(grupos[0], { monto: '50.00', fecha: '2026-10-03' });
  await compartido(grupos[1], { monto: '30.00', fecha: '2026-10-04' });
  await compartido(grupos[0], { monto: '40.00', fecha: '2026-11-01' });
});

afterAll(async () => {
  const usuarios = Object.values(ids);
  const movs = await Movimiento.findAll({ where: { usuarioId: usuarios } });
  await ParticipacionGasto.destroy({ where: { movimientoId: movs.map((m) => m.id) } });
  await Movimiento.destroy({ where: { usuarioId: usuarios } });
  await Presupuesto.destroy({ where: { usuarioId: usuarios } });
  await MiembroGrupo.destroy({ where: { grupoId: grupos } });
  await Grupo.destroy({ where: { id: grupos } });
  await Categoria.destroy({ where: { usuarioId: usuarios } });
  await Usuario.destroy({ where: { email: correos } });
  await sequelize.close();
});

const compartido = (grupoId, datos) =>
  agentA.post(`/api/grupos/${grupoId}/gastos`).send({ pagadorId: ids.a, categoriaId: catComida, ...datos });
const poner = (regla) =>
  agentA.put('/api/presupuestos').send({ categoriaId: catComida, mes: '2026-10', montoLimite: '1000.00', regla });
const estado = async () =>
  (await agentA.get('/api/presupuestos/estado?mes=2026-10')).body.find((e) => e.categoriaId === catComida);

test('con_compartidos suma su parte de dos grupos distintos', async () => {
  const put = await poner('con_compartidos');
  expect(put.status).toBe(200);
  expect(put.body.regla).toBe('con_compartidos');
  const e = await estado();
  // 100.00 personal + 25.00 (grupo 1) + 15.00 (grupo 2); el mes siguiente no cuenta.
  expect(e.consumido).toBe('140.00');
  expect(e.restante).toBe('860.00');
});

test('solo_personal no incluye compartidos', async () => {
  await poner('solo_personal');
  expect((await estado()).consumido).toBe('100.00');
});

test('no cuenta dos veces el gasto compartido que creó el usuario', async () => {
  await poner('con_compartidos');
  // Ana creó y pagó los gastos: solo cuenta su participación, no el monto total.
  expect((await estado()).consumido).toBe('140.00');
});

test('otro participante no cuenta lo que no es suyo', async () => {
  const catB = (await agentB.post('/api/categorias').send({ nombre: 'Propia' })).body.id;
  await agentB.put('/api/presupuestos').send({ categoriaId: catB, mes: '2026-10', montoLimite: '10.00', regla: 'con_compartidos' });
  const e = (await agentB.get('/api/presupuestos/estado?mes=2026-10')).body.find((x) => x.categoriaId === catB);
  expect(e.consumido).toBe('0.00');
});

describe('categoría por participante', () => {
  let catBruno;
  let catBrunoOtra;
  let movId;

  beforeAll(async () => {
    catBruno = (await agentB.post('/api/categorias').send({ nombre: 'Salidas' })).body.id;
    catBrunoOtra = (await agentB.post('/api/categorias').send({ nombre: 'Otra B' })).body.id;
    const res = await agentA.post(`/api/grupos/${grupos[0]}/gastos`).send({
      pagadorId: ids.a, monto: '80.00', fecha: '2026-09-10', categoriaId: catComida,
      participantes: [
        { usuarioId: ids.a, monto: '50.00' },
        { usuarioId: ids.b, monto: '30.00', categoriaId: catBruno },
      ],
    });
    expect(res.status).toBe(201);
    movId = res.body.id;
  });

  const consumo = async (agent, categoriaId) => {
    await agent.put('/api/presupuestos').send({ categoriaId, mes: '2026-09', montoLimite: '1000.00', regla: 'con_compartidos' });
    return (await agent.get('/api/presupuestos/estado?mes=2026-09')).body.find((e) => e.categoriaId === categoriaId).consumido;
  };

  test('el participante lo ve en su propia categoría y no en la del creador', async () => {
    expect(await consumo(agentB, catBruno)).toBe('30.00');
    expect(await consumo(agentB, catBrunoOtra)).toBe('0.00');
    // Ana solo ve su parte, no los 80.00 ni la de Bruno.
    expect(await consumo(agentA, catComida)).toBe('50.00');
  });

  test('categoría ajena del participante responde 400', async () => {
    const res = await agentA.post(`/api/grupos/${grupos[0]}/gastos`).send({
      pagadorId: ids.a, monto: '20.00', fecha: '2026-09-11',
      participantes: [{ usuarioId: ids.a, monto: '10.00' }, { usuarioId: ids.b, monto: '10.00', categoriaId: catComida }],
    });
    expect(res.status).toBe(400);
  });

  test('el backfill de la migración mantiene el consumo igual', async () => {
    const antes = await consumo(agentA, catComida);
    await ParticipacionGasto.update({ categoriaId: null }, { where: { movimientoId: movId } });
    await sequelize.query(
      'UPDATE participaciones_gasto p SET "categoriaId" = m."categoriaId" FROM movimientos m WHERE m.id = p."movimientoId" AND p."categoriaId" IS NULL'
    );
    expect(await consumo(agentA, catComida)).toBe(antes);
  });
});

describe('herencia de categoría por defecto', () => {
  let base;
  const partesDe = async (movimientoId) => {
    const filas = await ParticipacionGasto.findAll({ where: { movimientoId } });
    return Object.fromEntries(filas.map((f) => [f.usuarioId, f.categoriaId]));
  };
  const gasto = (datos) =>
    agentA.post(`/api/grupos/${grupos[1]}/gastos`).send({ pagadorId: ids.a, monto: '40.00', fecha: '2026-08-05', ...datos });

  beforeAll(async () => {
    base = await Categoria.create({ nombre: `Base presc ${sufijo}`, usuarioId: null });
  });
  afterAll(async () => {
    const movs = await Movimiento.findAll({ where: { usuarioId: ids.a, fecha: '2026-08-05' } });
    await ParticipacionGasto.destroy({ where: { movimientoId: movs.map((m) => m.id) } });
    await Movimiento.destroy({ where: { id: movs.map((m) => m.id) } });
    await Categoria.destroy({ where: { id: base.id } });
  });

  test('sin categoría explícita: una categoría base la heredan todos', async () => {
    const res = await gasto({ categoriaId: base.id });
    expect(res.status).toBe(201);
    expect(await partesDe(res.body.id)).toEqual({ [ids.a]: base.id, [ids.b]: base.id });
  });

  test('sin categoría explícita: una categoría propia solo la hereda su dueño y los demás quedan en null', async () => {
    const res = await gasto({ categoriaId: catComida });
    expect(await partesDe(res.body.id)).toEqual({ [ids.a]: catComida, [ids.b]: null });
  });

  test('la categoría explícita del participante siempre gana', async () => {
    const catB = (await agentB.post('/api/categorias').send({ nombre: 'Explícita' })).body.id;
    const res = await gasto({
      categoriaId: catComida,
      participantes: [{ usuarioId: ids.a, monto: '20.00' }, { usuarioId: ids.b, monto: '20.00', categoriaId: catB }],
    });
    expect(await partesDe(res.body.id)).toEqual({ [ids.a]: catComida, [ids.b]: catB });
  });
});
