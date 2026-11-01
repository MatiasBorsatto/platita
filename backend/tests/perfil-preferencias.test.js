const request = require('supertest');
const email = require('../src/services/email');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario } = require('../src/db/models');
const { registrarAlertaPresupuesto } = require('../src/modules/notificaciones/notificaciones.service');

const app = createApp();
const correo = `pref-test-${Date.now()}@example.com`;
const password = 'clave-segura-1';
let agent;
let usuario;
let espia;

beforeAll(async () => {
  agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre: 'Pía', email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  usuario = await Usuario.findOne({ where: { email: correo } });
});

beforeEach(() => {
  espia = jest.spyOn(email, 'enviarEmail').mockResolvedValue();
});

afterEach(() => jest.restoreAllMocks());

afterAll(async () => {
  await Usuario.destroy({ where: { email: correo } });
  await sequelize.close();
});

test('GET perfil devuelve nombre, email y preferenciasEmail sin datos sensibles', async () => {
  const res = await agent.get('/api/usuario/perfil');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ nombre: 'Pía', email: correo, preferenciasEmail: false });
  expect(res.body.passwordHash).toBeUndefined();
  expect(res.body.googleId).toBeUndefined();
});

test('un valor no booleano en preferenciasEmail responde 400 y no cambia nada', async () => {
  for (const valor of ['true', 1, null, 'si']) {
    const res = await agent.patch('/api/usuario/perfil').send({ preferenciasEmail: valor });
    expect(res.status).toBe(400);
  }
  await usuario.reload();
  expect(usuario.preferenciasEmail).toBe(false);
});

test('activar preferenciasEmail se persiste y GET lo devuelve', async () => {
  const res = await agent.patch('/api/usuario/perfil').send({ preferenciasEmail: true });
  expect(res.status).toBe(200);
  expect(res.body.preferenciasEmail).toBe(true);
  await usuario.reload();
  expect(usuario.preferenciasEmail).toBe(true);
  const get = await agent.get('/api/usuario/perfil');
  expect(get.body.preferenciasEmail).toBe(true);
});

test('la preferencia controla el email de alerta de presupuesto', async () => {
  const cat = (await agent.post('/api/categorias').send({ nombre: 'Pref' })).body.id;
  const pres = (await agent.put('/api/presupuestos').send({ categoriaId: cat, mes: '2026-08', montoLimite: '100.00' })).body.id;
  await agent.patch('/api/usuario/perfil').send({ preferenciasEmail: false });
  await registrarAlertaPresupuesto(usuario.id, pres, '80', 'Llegaste al 80%');
  expect(espia).not.toHaveBeenCalled();
  await agent.patch('/api/usuario/perfil').send({ preferenciasEmail: true });
  await registrarAlertaPresupuesto(usuario.id, pres, '100', 'Superaste el límite');
  expect(espia).toHaveBeenCalledTimes(1);
  expect(espia.mock.calls[0][0].para).toBe(correo);
});
