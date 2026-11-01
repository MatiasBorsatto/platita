const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario } = require('../src/db/models');

// Defecto D-01: un monto que supera DECIMAL(12,2) debe responder 400, no 500.
const app = createApp();
const correo = `monto-maximo-${Date.now()}@example.com`;

beforeAll(async () => {
  await request(app).post('/api/auth/registro').send({ nombre: 'Monto', email: correo, password: 'clave-monto-prueba-9' });
});

afterAll(async () => {
  await Usuario.destroy({ where: { email: correo } });
  await sequelize.close();
});

test('POST movimientos con un monto que supera la columna responde 400', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: correo, password: 'clave-monto-prueba-9' });
  const res = await agent
    .post('/api/movimientos')
    .send({ tipo: 'gasto', monto: '10000000000.00', fecha: '2026-10-30', descripcion: 'desborde' });
  expect(res.status).toBe(400);
});

test('POST movimientos con el máximo de la columna se acepta', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: correo, password: 'clave-monto-prueba-9' });
  const res = await agent
    .post('/api/movimientos')
    .send({ tipo: 'gasto', monto: '9999999999.99', fecha: '2026-10-30', descripcion: 'maximo' });
  expect(res.status).toBe(201);
});
