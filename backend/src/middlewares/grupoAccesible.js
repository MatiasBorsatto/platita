const { MiembroGrupo } = require('../db/models');
const { ErrorNoEncontrado, ErrorProhibido } = require('../utils/errores');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Verifica membresía (404 si no es miembro) y, opcionalmente, rol admin (403).
// Deja req.grupoId y req.miembro para el handler.
function grupoAccesible(rol) {
  return async (req, res, next) => {
    const grupoId = req.params.id;
    if (!UUID.test(grupoId)) throw new ErrorNoEncontrado('Grupo no encontrado');
    const miembro = await MiembroGrupo.findOne({ where: { grupoId, usuarioId: req.usuario.id } });
    if (!miembro) throw new ErrorNoEncontrado('Grupo no encontrado');
    if (rol === 'admin' && miembro.rol !== 'admin') {
      throw new ErrorProhibido('Solo un administrador puede hacer esto');
    }
    req.grupoId = grupoId;
    req.miembro = miembro;
    next();
  };
}

module.exports = { grupoAccesible };
