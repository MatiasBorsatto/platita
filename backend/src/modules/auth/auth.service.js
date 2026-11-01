const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../config/env');
const { Usuario } = require('../../db/models');
const { ErrorConflicto, ErrorNoAutenticado } = require('../../utils/errores');

const COSTO_HASH = 12;
const MENSAJE_LOGIN = 'Email o contraseña incorrectos';
// Hash válido para igualar el tiempo de respuesta cuando el email no existe.
const HASH_FALSO = bcrypt.hashSync('contrasena-inexistente', COSTO_HASH);

function firmar(usuario, tipo, expiresIn) {
  return jwt.sign({ sub: usuario.id, email: usuario.email, tipo }, JWT_SECRET, { expiresIn });
}

function emitirAccessToken(usuario) {
  return firmar(usuario, 'access', '15m');
}

function emitirTokens(usuario) {
  return { accessToken: emitirAccessToken(usuario), refreshToken: firmar(usuario, 'refresh', '30d') };
}

async function registrar({ nombre, email, password }) {
  const existente = await Usuario.findOne({ where: { email } });
  if (existente) throw new ErrorConflicto('El email ya está registrado');
  const passwordHash = await bcrypt.hash(password, COSTO_HASH);
  try {
    return await Usuario.create({ nombre, email, passwordHash });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') throw new ErrorConflicto('El email ya está registrado');
    throw err;
  }
}

async function login({ email, password }) {
  const usuario = await Usuario.findOne({ where: { email } });
  const ok = await bcrypt.compare(password, usuario?.passwordHash || HASH_FALSO);
  if (!usuario || !usuario.passwordHash || !ok) throw new ErrorNoAutenticado(MENSAJE_LOGIN);
  return emitirTokens(usuario);
}

async function refrescar(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, JWT_SECRET);
  } catch {
    throw new ErrorNoAutenticado('Sesión inválida');
  }
  if (payload.tipo !== 'refresh') throw new ErrorNoAutenticado('Sesión inválida');
  const usuario = await Usuario.findByPk(payload.sub);
  if (!usuario) throw new ErrorNoAutenticado('Sesión inválida');
  return emitirAccessToken(usuario);
}

module.exports = { registrar, login, refrescar, emitirTokens };
