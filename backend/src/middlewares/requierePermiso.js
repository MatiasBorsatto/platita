const { exigir } = require('../modules/autorizacion/autorizacion.service');

// Middleware de autorización: el permiso lo elige la ruta, no el cliente.
function requierePermiso(permiso) {
  return async (req, res, next) => {
    await exigir(req.usuario.id, permiso);
    next();
  };
}

module.exports = { requierePermiso };
