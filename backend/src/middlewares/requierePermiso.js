const { exigir } = require('../modules/autorizacion/autorizacion.service');

// Middleware de autorización: el permiso lo elige la ruta, no el cliente.
// Con { porGrupo: true } el permiso se evalúa dentro del grupo de la ruta; debe ir después de grupoAccesible.
function requierePermiso(permiso, { porGrupo = false } = {}) {
  return async (req, res, next) => {
    await exigir(req.usuario.id, permiso, porGrupo ? { grupoId: req.grupoId } : undefined);
    next();
  };
}

module.exports = { requierePermiso };
