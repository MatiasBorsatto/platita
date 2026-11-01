const { ErrorValidacion } = require('../../utils/errores');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarRegistro({ nombre, email, password } = {}) {
  if (typeof nombre !== 'string' || !nombre.trim()) throw new ErrorValidacion('El nombre es obligatorio');
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) throw new ErrorValidacion('El email no es válido');
  if (typeof password !== 'string' || password.length < 8) {
    throw new ErrorValidacion('La contraseña debe tener al menos 8 caracteres');
  }
  return { nombre: nombre.trim(), email: email.trim().toLowerCase(), password };
}

function validarLogin({ email, password } = {}) {
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw new ErrorValidacion('Email y contraseña son obligatorios');
  }
  return { email: email.trim().toLowerCase(), password };
}

module.exports = { validarRegistro, validarLogin };
