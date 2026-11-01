const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario } = require('../src/db/models');

const app = createApp();
const email = `auth-test-${Date.now()}@example.com`;
const password = 'clave-segura-1';

afterAll(async () => {
  await Usuario.destroy({ where: { email } });
  await sequelize.close();
});

test('registro crea usuario y devuelve 201', async () => {
  const res = await request(app).post('/api/auth/registro').send({ nombre: 'Ana', email, password });
  expect(res.status).toBe(201);
  expect(res.body.email).toBe(email);
  expect(res.body.passwordHash).toBeUndefined();
  const u = await Usuario.findOne({ where: { email } });
  expect(u.passwordHash).toMatch(/^\$2[aby]\$12\$/);
});

test('registro con email repetido responde 409', async () => {
  const res = await request(app).post('/api/auth/registro').send({ nombre: 'Ana', email, password });
  expect(res.status).toBe(409);
});

test('registro con datos inválidos responde 400', async () => {
  const res = await request(app).post('/api/auth/registro').send({ nombre: '', email: 'no-es-email', password: 'corta' });
  expect(res.status).toBe(400);
});

test('login con contraseña incorrecta responde 401 con mensaje genérico', async () => {
  const mala = await request(app).post('/api/auth/login').send({ email, password: 'otra-clave-123' });
  const inexistente = await request(app).post('/api/auth/login').send({ email: 'nadie@example.com', password });
  expect(mala.status).toBe(401);
  expect(inexistente.status).toBe(401);
  expect(mala.body.error).toBe(inexistente.body.error);
});

test('login correcto setea cookies httpOnly y permite acceder, refrescar y salir', async () => {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  const cookies = res.headers['set-cookie'];
  expect(cookies.some((c) => c.startsWith('accessToken=') && /HttpOnly/i.test(c) && /SameSite=Lax/i.test(c))).toBe(true);
  expect(cookies.some((c) => c.startsWith('refreshToken=') && /HttpOnly/i.test(c) && /SameSite=Lax/i.test(c))).toBe(true);

  const perfil = await agent.get('/api/usuario/perfil');
  expect(perfil.status).toBe(200);
  expect(perfil.body.email).toBe(email);

  const refresh = await agent.post('/api/auth/refresh');
  expect(refresh.status).toBe(200);
  expect(refresh.headers['set-cookie'].some((c) => c.startsWith('accessToken='))).toBe(true);

  const logout = await agent.post('/api/auth/logout');
  expect(logout.status).toBe(204);
  const despues = await agent.get('/api/usuario/perfil');
  expect(despues.status).toBe(401);
});

test('refresh sin cookie responde 401', async () => {
  const res = await request(app).post('/api/auth/refresh');
  expect(res.status).toBe(401);
});

test('ruta protegida sin cookie responde 401', async () => {
  const res = await request(app).get('/api/usuario/perfil');
  expect(res.status).toBe(401);
});
