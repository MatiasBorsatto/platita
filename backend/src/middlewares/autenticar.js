const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { ErrorNoAutenticado } = require('../utils/errores');

function autenticar(req, res, next) {
  const token = req.cookies?.accessToken;
  if (!token) throw new ErrorNoAutenticado('No autenticado');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.tipo !== 'access') throw new Error('tipo inválido');
    req.usuario = { id: payload.sub, email: payload.email };
  } catch {
    throw new ErrorNoAutenticado('No autenticado');
  }
  next();
}

module.exports = { autenticar };
