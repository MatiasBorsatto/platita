const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario } = require('../src/db/models');
const { paginar } = require('../src/utils/paginacion');

const app = createApp();
const email = `paginacion-${Date.now()}@example.com`;
const clave = 'clave-paginacion-9';
let agent;
let usuarioId;

beforeAll(async () => {
  await request(app).post('/api/auth/registro').send({ nombre: 'Pag', email, password: clave, fechaNacimiento: '1990-01-01' });
  usuarioId = (await Usuario.findOne({ where: { email } })).id;
  agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: clave });
  for (let i = 1; i <= 3; i += 1) await agent.post('/api/metas').send({ nombre: `Meta ${i}`, montoObjetivo: '100.00' });
});

afterAll(async () => {
  await Usuario.destroy({ where: { id: usuarioId } });
  await sequelize.close();
});

describe('paginación opcional', () => {
  test('sin parámetros devuelve la lista completa, como antes', () => {
    expect(paginar([1, 2, 3], {})).toEqual([1, 2, 3]);
  });

  test('con límite y página devuelve la porción y el total', () => {
    expect(paginar([1, 2, 3], { limite: '2', pagina: '2' })).toEqual({ items: [3], total: 3, pagina: 2, limite: 2 });
  });

  test('un límite fuera de rango se rechaza', () => {
    expect(() => paginar([1], { limite: '0' })).toThrow();
    expect(() => paginar([1], { limite: '101' })).toThrow();
    expect(() => paginar([1], { pagina: '0' })).toThrow();
  });

  test('la API de metas pagina solo cuando se pide', async () => {
    const todas = await agent.get('/api/metas');
    expect(Array.isArray(todas.body)).toBe(true);
    expect(todas.body).toHaveLength(3);
    const pagina = await agent.get('/api/metas?limite=2&pagina=2');
    expect(pagina.body.items).toHaveLength(1);
    expect(pagina.body.total).toBe(3);
  });
});
