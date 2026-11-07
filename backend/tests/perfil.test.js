const request = require('supertest');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const email = require('../src/services/email');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario } = require('../src/db/models');
const TokenRecuperacion = require('../src/db/models/token-recuperacion');

const app = createApp();
const correo = `perfil-test-${Date.now()}@example.com`;
const correoNuevo = `perfil-nuevo-${Date.now()}@example.com`;
const password = 'clave-segura-1';
let claveActual = password;
let espia;

beforeAll(async () => {
  await request(app).post('/api/auth/registro').send({ nombre: 'Ana', email: correo, password });
});

beforeEach(() => {
  espia = jest.spyOn(email, 'enviarEmail').mockResolvedValue();
});

afterEach(() => jest.restoreAllMocks());

afterAll(async () => {
  await Usuario.destroy({ where: { email: [correo, correoNuevo] } });
  await sequelize.close();
});

function tokenDelEmail() {
  const texto = espia.mock.calls[0][0].texto;
  return texto.match(/token=([0-9a-f]{64})/)[1];
}

async function sesion() {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: correo, password: claveActual });
  return agent;
}

test('recuperar con email inexistente responde 200 y no envía email', async () => {
  const res = await request(app).post('/api/auth/recuperar').send({ email: 'nadie-jamas@example.com' });
  expect(res.status).toBe(200);
  expect(espia).not.toHaveBeenCalled();
});

test('recuperar con email existente responde 200, envía email y guarda solo el hash', async () => {
  const res = await request(app).post('/api/auth/recuperar').send({ email: correo });
  expect(res.status).toBe(200);
  expect(espia).toHaveBeenCalledTimes(1);
  expect(espia.mock.calls[0][0].para).toBe(correo);
  const token = tokenDelEmail();
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  expect(await TokenRecuperacion.findOne({ where: { tokenHash: hash } })).not.toBeNull();
  expect(await TokenRecuperacion.findOne({ where: { tokenHash: token } })).toBeNull();
});

test('restablecer con token válido cambia la contraseña y el token es de un solo uso', async () => {
  await request(app).post('/api/auth/recuperar').send({ email: correo });
  const token = tokenDelEmail();
  const ok = await request(app).post('/api/auth/restablecer').send({ token, password: 'clave-nueva-22' });
  expect(ok.status).toBe(200);
  const u = await Usuario.findOne({ where: { email: correo } });
  claveActual = 'clave-nueva-22';
  expect(await bcrypt.compare('clave-nueva-22', u.passwordHash)).toBe(true);
  expect(u.passwordHash).toMatch(/^\$2[aby]\$12\$/);

  const reuso = await request(app).post('/api/auth/restablecer').send({ token, password: 'otra-clave-333' });
  expect(reuso.status).toBe(400);
  const sigue = await Usuario.findOne({ where: { email: correo } });
  expect(await bcrypt.compare('clave-nueva-22', sigue.passwordHash)).toBe(true);
});

test('restablecer con token vencido o inexistente responde 400', async () => {
  await request(app).post('/api/auth/recuperar').send({ email: correo });
  const token = tokenDelEmail();
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  await TokenRecuperacion.update({ venceEn: new Date(Date.now() - 1000) }, { where: { tokenHash: hash } });
  const vencido = await request(app).post('/api/auth/restablecer').send({ token, password: 'clave-nueva-33' });
  expect(vencido.status).toBe(400);
  const falso = await request(app).post('/api/auth/restablecer').send({ token: 'x'.repeat(64), password: 'clave-nueva-33' });
  expect(falso.status).toBe(400);
});

test('restablecer con contraseña corta responde 400', async () => {
  const res = await request(app).post('/api/auth/restablecer').send({ token: 'abc', password: 'corta' });
  expect(res.status).toBe(400);
});

test('PATCH perfil sin sesión responde 401', async () => {
  const res = await request(app).patch('/api/usuario/perfil').send({ nombre: 'X' });
  expect(res.status).toBe(401);
});

test('GET perfil devuelve nombre y email sin hash', async () => {
  const agent = await sesion();
  const res = await agent.get('/api/usuario/perfil');
  expect(res.status).toBe(200);
  expect(res.body.nombre).toBe('Ana');
  expect(res.body.email).toBe(correo);
  expect(res.body.passwordHash).toBeUndefined();
});

test('PATCH perfil cambia nombre y email', async () => {
  const agent = await sesion();
  const res = await agent.patch('/api/usuario/perfil').send({ nombre: 'Ana María', email: correoNuevo });
  expect(res.status).toBe(200);
  expect(res.body.nombre).toBe('Ana María');
  expect(res.body.email).toBe(correoNuevo);
  await Usuario.update({ email: correo }, { where: { email: correoNuevo } });
});

test('PATCH perfil cambia la contraseña solo con la actual correcta', async () => {
  const agent = await sesion();
  const sinActual = await agent.patch('/api/usuario/perfil').send({ passwordNueva: 'clave-nueva-44' });
  expect(sinActual.status).toBe(400);
  const mala = await agent.patch('/api/usuario/perfil').send({ passwordActual: 'incorrecta-99', passwordNueva: 'clave-nueva-44' });
  expect(mala.status).toBe(400);
  const ok = await agent.patch('/api/usuario/perfil').send({ passwordActual: 'clave-nueva-22', passwordNueva: 'clave-nueva-44' });
  expect(ok.status).toBe(200);
  const u = await Usuario.findOne({ where: { email: correo } });
  expect(await bcrypt.compare('clave-nueva-44', u.passwordHash)).toBe(true);
});

test('recuperar responde 200 idéntico aunque falle el envío del email', async () => {
  const logs = jest.spyOn(console, 'error').mockImplementation(() => {});
  espia.mockRejectedValue(new Error(`SMTP caído para ${correo}`));
  const existente = await request(app).post('/api/auth/recuperar').send({ email: correo });
  const inexistente = await request(app).post('/api/auth/recuperar').send({ email: 'nadie-jamas@example.com' });
  expect(existente.status).toBe(200);
  expect(existente.status).toBe(inexistente.status);
  expect(existente.body).toEqual(inexistente.body);
  await new Promise((r) => setImmediate(r));
  expect(JSON.stringify(logs.mock.calls)).not.toContain(correo);
});
