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
  await agent.post('/api/auth/registro').send({ fechaNacimiento: '1990-01-01', nombre, email: correo, password });
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
    expect(res.body.aporte).toMatchObject({ monto: '5000.00' });
    expect(res.body.aporte.movimientoId).toEqual(expect.any(String));
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

describe('aportes y retiros de metas en el historial de movimientos', () => {
  const historial = async (agent, mes) => (await agent.get(`/api/movimientos?mes=${mes}&limit=100`)).body.items;
  const miPlata = async (agent) => (await agent.get('/api/movimientos/dinero-actual')).body.dineroActual;

  test('un aporte desde Metas queda en el historial y no cambia Mi plata', async () => {
    const meta = (await crearMeta(agentA, { nombre: `Historial ${sufijo}` })).body;
    const antes = await miPlata(agentA);
    const res = await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '3000.00', fecha: '2026-09-03' });
    expect(res.status).toBe(201);
    const registro = (await historial(agentA, '2026-09')).find((m) => m.id === res.body.aporte.movimientoId);
    expect(registro).toMatchObject({
      tipo: 'aporte_meta', monto: '3000.00', moneda: 'ARS', fecha: '2026-09-03', metaId: meta.id,
      descripcion: `Aporte a la meta «Historial ${sufijo}»`
    });
    expect(await miPlata(agentA)).toBe(antes);
  });

  test('un retiro queda como retiro_meta con el monto en positivo y en la moneda de la meta', async () => {
    const meta = (await crearMeta(agentA, { nombre: `Dólares ${sufijo}`, moneda: 'USD' })).body;
    await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '50.00', fecha: '2026-09-04' });
    const res = await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '-20.00', fecha: '2026-09-05' });
    const registro = (await historial(agentA, '2026-09')).find((m) => m.id === res.body.aporte.movimientoId);
    expect(registro).toMatchObject({ tipo: 'retiro_meta', monto: '20.00', moneda: 'USD', descripcion: `Retiro de la meta «Dólares ${sufijo}»` });
    expect(res.body.meta.acumulado).toBe('30.00');
  });

  // También es la regresión de los retiros: un aporte negativo en el mes hacía responder 400
  // "Monto inválido" al resumen mensual y a la serie histórica.
  test('no cuenta como ingreso ni gasto en las estadísticas, aun con un retiro en el mes', async () => {
    const antes = (await agentA.get('/api/estadisticas/mensual?mes=2026-08')).body;
    const meta = (await crearMeta(agentA)).body;
    await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '700.00', fecha: '2026-08-10' });
    await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '-200.00', fecha: '2026-08-11' });
    const respuesta = await agentA.get('/api/estadisticas/mensual?mes=2026-08');
    expect(respuesta.status).toBe(200);
    const despues = respuesta.body;
    const historico = await agentA.get('/api/estadisticas/historico?desde=2026-08&hasta=2026-08');
    expect(historico.status).toBe(200);
    expect(despues.ingresos).toBe(antes.ingresos);
    expect(despues.gastos).toBe(antes.gastos);
    expect(despues.aportesMetas).toBe('500.00');
  });

  test('el registro no se edita ni se borra desde Movimientos', async () => {
    const meta = (await crearMeta(agentA)).body;
    const { aporte } = (await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '100.00', fecha: '2026-09-06' })).body;
    const editar = await agentA.patch(`/api/movimientos/${aporte.movimientoId}`).send({ monto: '999.00' });
    expect(editar.status).toBe(409);
    expect(editar.body.error ?? editar.body.mensaje).toMatch(/Metas/);
    expect((await agentA.delete(`/api/movimientos/${aporte.movimientoId}`)).status).toBe(409);
    expect((await AporteMeta.findByPk(aporte.id)).monto).toBe('100.00');
  });

  test('al eliminar la meta se borran sus registros de aportes del historial', async () => {
    const meta = (await crearMeta(agentA)).body;
    const { aporte } = (await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '100.00', fecha: '2026-09-07' })).body;
    expect((await agentA.delete(`/api/metas/${meta.id}`)).status).toBe(204);
    expect(await Movimiento.findByPk(aporte.movimientoId)).toBeNull();
  });
});
