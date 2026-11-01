const { NODE_ENV } = require('../../config/env');
const service = require('./auth.service');
const { validarRegistro, validarLogin } = require('./auth.validation');
const { ErrorNoAutenticado } = require('../../utils/errores');

const MINUTO = 60 * 1000;
const DIA = 24 * 60 * MINUTO;

function opcionesCookie(maxAge) {
  return { httpOnly: true, secure: NODE_ENV === 'production', sameSite: 'lax', maxAge };
}

function setAccess(res, token) {
  res.cookie('accessToken', token, opcionesCookie(15 * MINUTO));
}

async function registro(req, res) {
  const usuario = await service.registrar(validarRegistro(req.body));
  res.status(201).json({ id: usuario.id, nombre: usuario.nombre, email: usuario.email });
}

async function login(req, res) {
  const { accessToken, refreshToken } = await service.login(validarLogin(req.body));
  setAccess(res, accessToken);
  res.cookie('refreshToken', refreshToken, opcionesCookie(30 * DIA));
  res.json({ mensaje: 'Sesión iniciada' });
}

async function refresh(req, res) {
  const token = req.cookies?.refreshToken;
  if (!token) throw new ErrorNoAutenticado('Sesión inválida');
  setAccess(res, await service.refrescar(token));
  res.json({ mensaje: 'Sesión renovada' });
}

function logout(req, res) {
  const { maxAge, ...opciones } = opcionesCookie();
  res.clearCookie('accessToken', opciones);
  res.clearCookie('refreshToken', opciones);
  res.status(204).end();
}

module.exports = { registro, login, refresh, logout };
