const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Categoria } = require('../src/db/models');

const app = createApp();
const email = `pres-moneda-${Date.now()}@example.com`;
const clave = 'clave-presmoneda-9';
let agent;
let usuarioId;
let categoriaId;

beforeAll(async () => {
  await request(app).post('/api/auth/registro').send({ nombre: 'PM', email, password: clave, fechaNacimiento: '1990-01-01' });
  usuarioId = (await Usuario.findOne({ where: { email } })).id;
  agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: clave });
  categoriaId = (await Categoria.findOne({ where: { nombre: 'Viajes', usuarioId: null } }))?.id
    ?? (await agent.get('/api/categorias')).body[0].id;
  await agent.post('/api/movimientos').send({ tipo: 'gasto', monto: '400.00', fecha: '2026-06-02', descripcion: 'peso', categoriaId });
  await agent.post('/api/movimientos').send({ tipo: 'gasto', monto: '90.00', fecha: '2026-06-03', descripcion: 'usd', categoriaId, moneda: 'USD' });
});

afterAll(async () => {
  await Usuario.destroy({ where: { id: usuarioId } });
  await sequelize.close();
});

test('un presupuesto en dólares consume solo los gastos en dólares', async () => {
  await agent.put('/api/presupuestos').send({ mes: '2026-06', categoriaId, montoLimite: '100.00', regla: 'solo_personal', moneda: 'USD' });
  const estado = await agent.get('/api/presupuestos/estado?mes=2026-06');
  const usd = estado.body.find((p) => p.moneda === 'USD');
  expect(usd.consumido).toBe('90.00');
});

test('en pesos conviven con el de dólares sin pisarse', async () => {
  await agent.put('/api/presupuestos').send({ mes: '2026-06', categoriaId, montoLimite: '1000.00', regla: 'solo_personal', moneda: 'ARS' });
  const estado = await agent.get('/api/presupuestos/estado?mes=2026-06');
  expect(estado.body.filter((p) => p.mes === '2026-06')).toHaveLength(2);
  expect(estado.body.find((p) => p.moneda === 'ARS').consumido).toBe('400.00');
});
