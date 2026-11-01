const jwt = require('jsonwebtoken');
const { sequelize } = require('../src/db/sequelize');
const { Usuario } = require('../src/db/models');
const { loginConGoogle } = require('../src/modules/auth/google.service');

const sufijo = Date.now();
const emailNuevo = `google-nuevo-${sufijo}@example.com`;
const emailExistente = `google-existente-${sufijo}@example.com`;
const emails = [emailNuevo, emailExistente];

const verificadorDe = (datos) => async () => datos;

afterAll(async () => {
  await Usuario.destroy({ where: { email: emails } });
  await sequelize.close();
});

test('crea un usuario nuevo sin passwordHash y devuelve tokens', async () => {
  const verificar = verificadorDe({ googleId: `g-nuevo-${sufijo}`, email: emailNuevo, nombre: 'Nuevo' });
  const { accessToken, refreshToken } = await loginConGoogle('token-falso', verificar);
  const u = await Usuario.findOne({ where: { email: emailNuevo } });
  expect(u.googleId).toBe(`g-nuevo-${sufijo}`);
  expect(u.passwordHash).toBeNull();
  expect(jwt.decode(accessToken).sub).toBe(u.id);
  expect(jwt.decode(refreshToken).tipo).toBe('refresh');
});

test('vincula la cuenta existente por email sin duplicar', async () => {
  const existente = await Usuario.create({ nombre: 'Ya', email: emailExistente, passwordHash: 'hash' });
  const verificar = verificadorDe({ googleId: `g-exist-${sufijo}`, email: emailExistente, nombre: 'Ya' });
  const { accessToken } = await loginConGoogle('token-falso', verificar);
  const usuarios = await Usuario.findAll({ where: { email: emailExistente } });
  expect(usuarios).toHaveLength(1);
  expect(usuarios[0].id).toBe(existente.id);
  expect(usuarios[0].googleId).toBe(`g-exist-${sufijo}`);
  expect(usuarios[0].passwordHash).toBe('hash');
  expect(jwt.decode(accessToken).sub).toBe(existente.id);
});

test('el segundo login con el mismo googleId devuelve el mismo usuario', async () => {
  const verificar = verificadorDe({ googleId: `g-nuevo-${sufijo}`, email: emailNuevo, nombre: 'Nuevo' });
  const { accessToken } = await loginConGoogle('token-falso', verificar);
  const usuarios = await Usuario.findAll({ where: { googleId: `g-nuevo-${sufijo}` } });
  expect(usuarios).toHaveLength(1);
  expect(jwt.decode(accessToken).sub).toBe(usuarios[0].id);
});
