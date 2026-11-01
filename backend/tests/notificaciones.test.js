const request = require('supertest');
const email = require('../src/services/email');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Notificacion } = require('../src/db/models');
const { registrarAlertaPresupuesto } = require('../src/modules/notificaciones/notificaciones.service');

const app = createApp();
const sufijo = Date.now();
const password = 'clave-segura-1';
let agentA;
let agentB;
let userA;
let userB;
let catA;
let presA;
let spy;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

beforeAll(async () => {
  agentA = await sesion(`notif-a-${sufijo}@example.com`, 'Ana');
  agentB = await sesion(`notif-b-${sufijo}@example.com`, 'Bruno');
  userA = await Usuario.findOne({ where: { email: `notif-a-${sufijo}@example.com` } });
  userB = await Usuario.findOne({ where: { email: `notif-b-${sufijo}@example.com` } });
  catA = (await agentA.post('/api/categorias').send({ nombre: 'Salidas' })).body.id;
  presA = (await agentA.put('/api/presupuestos').send({ categoriaId: catA, mes: '2026-07', montoLimite: '100.00' })).body.id;
});

beforeEach(() => {
  spy = jest.spyOn(email, 'enviarEmail').mockResolvedValue();
});

afterEach(async () => {
  spy.mockRestore();
  await userA.update({ preferenciasEmail: false });
  await Notificacion.destroy({ where: { usuarioId: [userA.id, userB.id] } });
});

afterAll(async () => {
  await Usuario.destroy({ where: { id: [userA.id, userB.id] } });
  await sequelize.close();
});

test('dos llamadas con la misma alerta crean una sola notificación', async () => {
  await registrarAlertaPresupuesto(userA.id, presA, '80', 'Llegaste al 80%');
  await registrarAlertaPresupuesto(userA.id, presA, '80', 'Llegaste al 80%');
  expect(await Notificacion.count({ where: { presupuestoId: presA, alerta: '80' } })).toBe(1);
});

test('con preferenciasEmail en false no se envía email', async () => {
  await registrarAlertaPresupuesto(userA.id, presA, '80', 'Llegaste al 80%');
  expect(spy).not.toHaveBeenCalled();
});

test('con preferenciasEmail en true se envía un solo email', async () => {
  await userA.update({ preferenciasEmail: true });
  await registrarAlertaPresupuesto(userA.id, presA, '100', 'Superaste el límite');
  await registrarAlertaPresupuesto(userA.id, presA, '100', 'Superaste el límite');
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy.mock.calls[0][0].para).toBe(userA.email);
});

test('un fallo del email no rompe el registro ni el pedido de estado', async () => {
  await userA.update({ preferenciasEmail: true });
  spy.mockRejectedValue(new Error('smtp caído'));
  const err = jest.spyOn(console, 'error').mockImplementation(() => {});
  await agentA.post('/api/movimientos').send({ tipo: 'gasto', monto: '90.00', fecha: '2026-07-05', categoriaId: catA });
  const res = await agentA.get('/api/presupuestos/estado?mes=2026-07');
  expect(res.status).toBe(200);
  expect(await Notificacion.count({ where: { presupuestoId: presA, alerta: '80' } })).toBe(1);
  const logs = JSON.stringify(err.mock.calls);
  expect(logs).not.toContain(userA.email);
  err.mockRestore();
});

test('GET lista solo las propias y PATCH marca como leída', async () => {
  await registrarAlertaPresupuesto(userA.id, presA, '80', 'Llegaste al 80%');
  const lista = await agentA.get('/api/notificaciones');
  expect(lista.status).toBe(200);
  expect(lista.body).toHaveLength(1);
  expect(lista.body[0].leida).toBe(false);
  expect((await agentB.get('/api/notificaciones')).body).toEqual([]);
  const id = lista.body[0].id;
  expect((await agentB.patch(`/api/notificaciones/${id}/leida`)).status).toBe(404);
  const ok = await agentA.patch(`/api/notificaciones/${id}/leida`);
  expect(ok.status).toBe(200);
  expect(ok.body.leida).toBe(true);
});

test('requiere autenticación', async () => {
  expect((await request(app).get('/api/notificaciones')).status).toBe(401);
});

test('un envío de email colgado no demora la respuesta de /estado', async () => {
  await userA.update({ preferenciasEmail: true });
  spy.mockImplementation(() => new Promise(() => {}));
  await agentA.post('/api/movimientos').send({ tipo: 'gasto', monto: '95.00', fecha: '2026-07-06', categoriaId: catA });
  const res = await agentA.get('/api/presupuestos/estado?mes=2026-07');
  expect(res.status).toBe(200);
  expect(await Notificacion.count({ where: { presupuestoId: presA } })).toBe(1);
  expect(spy).toHaveBeenCalledTimes(1);
}, 3000);
