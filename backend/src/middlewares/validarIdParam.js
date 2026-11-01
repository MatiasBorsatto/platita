const { ErrorNoEncontrado } = require('../utils/errores');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Para router.param('id', ...): un id que no es UUID no existe, así que responde 404.
function validarIdParam(req, res, next, valor) {
  if (typeof valor !== 'string' || !UUID.test(valor)) throw new ErrorNoEncontrado('No encontrado');
  next();
}

module.exports = { validarIdParam };
