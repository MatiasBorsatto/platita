const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { Usuario } = require('../db/models');
const { ErrorNoAutenticado, ErrorProhibido } = require('../utils/errores');

// Código que el frontend usa para llevar al usuario a cargar su fecha de nacimiento.
const FECHA_PENDIENTE = 'FECHA_NACIMIENTO_PENDIENTE';

function verificarToken(req) {
  const token = req.cookies?.accessToken;
  if (!token) throw new ErrorNoAutenticado('No autenticado');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.tipo !== 'access') throw new Error('tipo inválido');
    req.usuario = { id: payload.sub, email: payload.email };
  } catch {
    throw new ErrorNoAutenticado('No autenticado');
  }
}

// Autentica y exige que el usuario tenga cargada su fecha de nacimiento (obligatoria desde el registro).
async function autenticar(req, res, next) {
  verificarToken(req);
  const usuario = await Usuario.findByPk(req.usuario.id, { attributes: ['fechaNacimiento'] });
  if (!usuario) throw new ErrorNoAutenticado('No autenticado');
  if (!usuario.fechaNacimiento) {
    const error = new ErrorProhibido('Completá tu fecha de nacimiento para continuar');
    error.codigo = FECHA_PENDIENTE;
    throw error;
  }
  next();
}

// Solo autentica. Lo usa el perfil, donde el usuario carga la fecha que le falta.
function autenticarSinFecha(req, res, next) {
  verificarToken(req);
  next();
}

module.exports = { autenticar, autenticarSinFecha, FECHA_PENDIENTE };
