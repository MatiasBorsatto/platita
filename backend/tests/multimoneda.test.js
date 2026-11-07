const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario } = require('../src/db/models');

const app = createApp();
const email = `multimoneda-${Date.now()}@example.com`;
const clave = 'clave-multimoneda-9';
let agent;
let usuarioId;

beforeAll(async () => {
  await request(app).post('/api/auth/registro').send({ nombre: 'Multi', email, password: clave, fechaNacimiento: '1990-01-01' });
  usuarioId = (await Usuario.findOne({ where: { email } })).id;
  agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: clave });
  await agent.post('/api/movimientos').send({ tipo: 'gasto', monto: '100.00', fecha: '2026-05-10', descripcion: 'pesos' });
  await agent.post('/api/movimientos').send({ tipo: 'gasto', monto: '50.00', fecha: '2026-05-11', descripcion: 'dolares', moneda: 'USD' });
});

afterAll(async () => {
  await Usuario.destroy({ where: { id: usuarioId } });
  await sequelize.close();
});

test('los totales de primer nivel son en pesos y cada moneda aparece por separado', async () => {
  const res = await agent.get('/api/estadisticas/mensual?mes=2026-05');
  expect(res.body.gastos).toBe('100.00');
  const usd = res.body.porMoneda.find((m) => m.moneda === 'USD');
  expect(usd.gastos).toBe('50.00');
});

test('una moneda inválida se rechaza al crear el movimiento', async () => {
  const res = await agent.post('/api/movimientos').send({ tipo: 'gasto', monto: '1.00', fecha: '2026-05-12', descripcion: 'x', moneda: 'dolares' });
  expect(res.status).toBe(400);
});
