const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Movimiento, Meta, AporteMeta } = require('../src/db/models');
const { progresoMeta } = require('../src/modules/metas/metas.calculo');

describe('progresoMeta', () => {
  test('25% de 20000.00 con 5000.00 acumulado', () => {
    expect(progresoMeta({ montoObjetivo: '20000.00', acumulado: '5000.00' })).toEqual({
      porcentaje: 25,
      restante: '15000.00',
    });
  });

  test('al superar el objetivo el restante es negativo', () => {
    expect(progresoMeta({ montoObjetivo: '100.00', acumulado: '150.50' })).toEqual({
      porcentaje: 150.5,
      restante: '-50.50',
    });
  });

  test('acumulado negativo (retiros mayores a aportes)', () => {
    expect(progresoMeta({ montoObjetivo: '100.00', acumulado: '-10.00' })).toEqual({
      porcentaje: -10,
      restante: '110.00',
    });
  });
});

const app = createApp();
const sufijo = Date.now();
const correoA = `metas-a-${sufijo}@example.com`;
const correoB = `metas-b-${sufijo}@example.com`;
const password = 'clave-segura-1';
let agentA;
let agentB;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

beforeAll(async () => {
  agentA = await sesion(correoA, 'Ana');
  agentB = await sesion(correoB, 'Bruno');
});

afterAll(async () => {
  const usuarios = await Usuario.findAll({ where: { email: [correoA, correoB] } });
  const ids = usuarios.map((u) => u.id);
  const metas = await Meta.findAll({ where: { usuarioId: ids } });
  await AporteMeta.destroy({ where: { metaId: metas.map((m) => m.id) } });
  await Movimiento.destroy({ where: { usuarioId: ids } });
  await Meta.destroy({ where: { usuarioId: ids } });
  await Usuario.destroy({ where: { email: [correoA, correoB] } });
  await sequelize.close();
});

async function crearMeta(agent, datos = {}) {
  return agent.post('/api/metas').send({ nombre: 'Viaje', montoObjetivo: '20000.00', ...datos });
}

describe('metas', () => {
  test('requiere sesión', async () => {
    expect((await request(app).get('/api/metas')).status).toBe(401);
  });

  test('crea una meta personal con progreso en cero', async () => {
    const res = await crearMeta(agentA, { fechaLimite: '2027-12-31' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      nombre: 'Viaje',
      montoObjetivo: '20000.00',
      fechaLimite: '2027-12-31',
      grupoId: null,
      acumulado: '0.00',
      porcentaje: 0,
      restante: '20000.00',
    });
  });

  test('responde 404 si el grupoId no existe o no es del usuario', async () => {
    const res = await crearMeta(agentA, { grupoId: '11111111-1111-4111-8111-111111111111' });
    expect(res.status).toBe(404);
  });

  test('rechaza datos inválidos', async () => {
    expect((await crearMeta(agentA, { nombre: '' })).status).toBe(400);
    expect((await crearMeta(agentA, { montoObjetivo: '0' })).status).toBe(400);
    expect((await crearMeta(agentA, { fechaLimite: '2027-02-30' })).status).toBe(400);
  });

  test('aporte manual de 5000.00 a una meta de 20000.00 da 25%', async () => {
    const meta = (await crearMeta(agentA)).body;
    const res = await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '5000.00', fecha: '2026-10-01' });
    expect(res.status).toBe(201);
    expect(res.body.aporte).toMatchObject({ monto: '5000.00', movimientoId: null });
    expect(res.body.meta).toMatchObject({ acumulado: '5000.00', porcentaje: 25, restante: '15000.00' });
  });

  test('un retiro es un aporte con monto negativo', async () => {
    const meta = (await crearMeta(agentA)).body;
    await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '5000.00', fecha: '2026-10-01' });
    const res = await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '-1000.00', fecha: '2026-10-02' });
    expect(res.status).toBe(201);
    expect(res.body.aporte.monto).toBe('-1000.00');
    expect(res.body.meta).toMatchObject({ acumulado: '4000.00', porcentaje: 20 });
  });

  test('rechaza aportes con monto cero o fecha inválida', async () => {
    const meta = (await crearMeta(agentA)).body;
    expect((await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '0', fecha: '2026-10-01' })).status).toBe(400);
    expect((await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '10', fecha: 'ayer' })).status).toBe(400);
  });

  test('lista solo las metas propias', async () => {
    const meta = (await crearMeta(agentA, { nombre: 'Solo de Ana' })).body;
    const deA = (await agentA.get('/api/metas')).body;
    const deB = (await agentB.get('/api/metas')).body;
    expect(deA.some((m) => m.id === meta.id)).toBe(true);
    expect(deB.some((m) => m.id === meta.id)).toBe(false);
  });

  test('la meta de otro usuario da 404 en patch, delete y aportes', async () => {
    const meta = (await crearMeta(agentA)).body;
    expect((await agentB.patch(`/api/metas/${meta.id}`).send({ nombre: 'x' })).status).toBe(404);
    expect((await agentB.delete(`/api/metas/${meta.id}`)).status).toBe(404);
    const ap = await agentB.post(`/api/metas/${meta.id}/aportes`).send({ monto: '10', fecha: '2026-10-01' });
    expect(ap.status).toBe(404);
  });

  test('edita y elimina una meta', async () => {
    const meta = (await crearMeta(agentA)).body;
    const ed = await agentA.patch(`/api/metas/${meta.id}`).send({ nombre: 'Auto', montoObjetivo: '40000.00' });
    expect(ed.status).toBe(200);
    expect(ed.body).toMatchObject({ nombre: 'Auto', montoObjetivo: '40000.00' });
    expect((await agentA.delete(`/api/metas/${meta.id}`)).status).toBe(204);
    expect(await Meta.findByPk(meta.id)).toBeNull();
  });
});

describe('movimientos asociados a una meta', () => {
  test('un ingreso con metaId crea un aporte positivo con movimientoId', async () => {
    const meta = (await crearMeta(agentA)).body;
    const res = await agentA
      .post('/api/movimientos')
      .send({ tipo: 'ingreso', monto: '3000.00', fecha: '2026-10-05', metaId: meta.id });
    expect(res.status).toBe(201);
    const aportes = await AporteMeta.findAll({ where: { metaId: meta.id } });
    expect(aportes).toHaveLength(1);
    expect(aportes[0].monto).toBe('3000.00');
    expect(aportes[0].movimientoId).toBe(res.body.id);
    expect(aportes[0].fecha).toBe('2026-10-05');
  });

  test('un gasto con metaId crea un aporte negativo (retiro)', async () => {
    const meta = (await crearMeta(agentA)).body;
    await agentA.post('/api/movimientos').send({ tipo: 'ingreso', monto: '3000.00', fecha: '2026-10-05', metaId: meta.id });
    const res = await agentA
      .post('/api/movimientos')
      .send({ tipo: 'gasto', monto: '500.50', fecha: '2026-10-06', metaId: meta.id });
    expect(res.status).toBe(201);
    const aporte = await AporteMeta.findOne({ where: { movimientoId: res.body.id } });
    expect(aporte.monto).toBe('-500.50');
    const lista = (await agentA.get('/api/metas')).body.find((m) => m.id === meta.id);
    expect(lista.acumulado).toBe('2499.50');
  });

  test('editar el monto de un ingreso con meta actualiza su aporte y el acumulado', async () => {
    const meta = (await crearMeta(agentA)).body;
    const mov = await agentA
      .post('/api/movimientos')
      .send({ tipo: 'ingreso', monto: '3000.00', fecha: '2026-10-05', metaId: meta.id });
    const res = await agentA.patch(`/api/movimientos/${mov.body.id}`).send({ monto: '1200.00' });
    expect(res.status).toBe(200);
    const aporte = await AporteMeta.findOne({ where: { movimientoId: mov.body.id } });
    expect(aporte.monto).toBe('1200.00');
    const lista = (await agentA.get('/api/metas')).body.find((m) => m.id === meta.id);
    expect(lista.acumulado).toBe('1200.00');
    await agentA.patch(`/api/movimientos/${mov.body.id}`).send({ tipo: 'gasto' });
    const lista2 = (await agentA.get('/api/metas')).body.find((m) => m.id === meta.id);
    expect(lista2.acumulado).toBe('-1200.00');
  });

  test('un movimiento con la meta de otro usuario da 404 y no crea nada', async () => {
    const meta = (await crearMeta(agentA)).body;
    const antes = await Movimiento.count({ where: { descripcion: `ajena-${sufijo}` } });
    const res = await agentB
      .post('/api/movimientos')
      .send({ tipo: 'ingreso', monto: '10', fecha: '2026-10-05', metaId: meta.id, descripcion: `ajena-${sufijo}` });
    expect(res.status).toBe(404);
    expect(await Movimiento.count({ where: { descripcion: `ajena-${sufijo}` } })).toBe(antes);
    expect(await AporteMeta.count({ where: { metaId: meta.id } })).toBe(0);
  });

  test('un metaId mal formado da 400', async () => {
    const res = await agentA
      .post('/api/movimientos')
      .send({ tipo: 'ingreso', monto: '10', fecha: '2026-10-05', metaId: 'abc' });
    expect(res.status).toBe(400);
  });
});
