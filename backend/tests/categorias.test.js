const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Categoria } = require('../src/db/models');

const app = createApp();
const sufijo = Date.now();
const correoA = `cat-a-${sufijo}@example.com`;
const correoB = `cat-b-${sufijo}@example.com`;
const password = 'clave-segura-1';
let agentA;
let agentB;
let base;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

beforeAll(async () => {
  agentA = await sesion(correoA, 'Ana');
  agentB = await sesion(correoB, 'Beto');
  base = await Categoria.create({ nombre: `Base test ${sufijo}`, usuarioId: null });
});

afterAll(async () => {
  const usuarios = await Usuario.findAll({ where: { email: [correoA, correoB] } });
  await Categoria.destroy({ where: { usuarioId: usuarios.map((u) => u.id) } });
  await Categoria.destroy({ where: { id: base.id } });
  await Usuario.destroy({ where: { email: [correoA, correoB] } });
  await sequelize.close();
});

test('sin sesión responde 401', async () => {
  const res = await request(app).get('/api/categorias');
  expect(res.status).toBe(401);
});

test('listar incluye base y propias, no las de otros', async () => {
  const propia = await agentA.post('/api/categorias').send({ nombre: 'Mascotas' });
  expect(propia.status).toBe(201);
  const res = await agentA.get('/api/categorias');
  expect(res.status).toBe(200);
  const ids = res.body.map((c) => c.id);
  expect(ids).toContain(base.id);
  expect(ids).toContain(propia.body.id);
  const resB = await agentB.get('/api/categorias');
  expect(resB.body.map((c) => c.id)).not.toContain(propia.body.id);
});

test('crear sin nombre responde 400', async () => {
  const res = await agentA.post('/api/categorias').send({ nombre: '  ' });
  expect(res.status).toBe(400);
});

test('editar una base responde 403', async () => {
  const res = await agentA.patch(`/api/categorias/${base.id}`).send({ nombre: 'X' });
  expect(res.status).toBe(403);
});

test('archivar una base responde 403', async () => {
  const res = await agentA.delete(`/api/categorias/${base.id}`);
  expect(res.status).toBe(403);
});

test('editar una propia cambia el nombre', async () => {
  const c = await agentA.post('/api/categorias').send({ nombre: 'Viajes' });
  const res = await agentA.patch(`/api/categorias/${c.body.id}`).send({ nombre: 'Viajes largos' });
  expect(res.status).toBe(200);
  expect(res.body.nombre).toBe('Viajes largos');
});

test('editar o archivar la de otro usuario responde 404', async () => {
  const c = await agentA.post('/api/categorias').send({ nombre: 'Privada' });
  expect((await agentB.patch(`/api/categorias/${c.body.id}`).send({ nombre: 'Hack' })).status).toBe(404);
  expect((await agentB.delete(`/api/categorias/${c.body.id}`)).status).toBe(404);
});

test('id inexistente responde 404', async () => {
  const res = await agentA.patch('/api/categorias/00000000-0000-4000-8000-000000000000').send({ nombre: 'X' });
  expect(res.status).toBe(404);
});

test('archivar una propia la saca del listado', async () => {
  const c = await agentA.post('/api/categorias').send({ nombre: 'Temporal' });
  const del = await agentA.delete(`/api/categorias/${c.body.id}`);
  expect(del.status).toBe(200);
  expect(del.body.archivada).toBe(true);
  const res = await agentA.get('/api/categorias');
  expect(res.body.map((x) => x.id)).not.toContain(c.body.id);
  expect(await Categoria.findByPk(c.body.id)).not.toBeNull();
});

describe('ids con formato inválido', () => {
  test('PATCH y DELETE con un id que no es UUID dan 404', async () => {
    expect((await agentA.patch('/api/categorias/no-es-uuid').send({ nombre: 'X' })).status).toBe(404);
    expect((await agentA.delete('/api/categorias/no-es-uuid')).status).toBe(404);
  });
});
