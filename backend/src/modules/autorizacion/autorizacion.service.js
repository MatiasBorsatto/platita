const { Usuario, VinculoTutor, PermisoMenor } = require('../../db/models');
const { ErrorProhibido, ErrorValidacion } = require('../../utils/errores');
const { hoyBA } = require('../../utils/fechas');
const { clasificar } = require('./clasificacion');
const { TODOS, TARJETAS, FAMILIARES } = require('./permisos');

// Clasificación calculada en el backend a partir de la base. Nunca viene del cliente.
async function clasificacionDe(usuarioId) {
  const usuario = await Usuario.findByPk(usuarioId, { attributes: ['fechaNacimiento'] });
  return clasificar(usuario?.fechaNacimiento ?? null, hoyBA().slice(0, 10));
}

// Decide si un usuario puede ejercer un permiso. Un menor lo tiene solo si algún tutor vinculado
// (dentro del grupo indicado, si se pasa) lo concedió explícitamente.
async function puede(usuarioId, permiso, { grupoId = null } = {}) {
  if (!TODOS.includes(permiso)) throw new ErrorValidacion(`Permiso desconocido: ${permiso}`);
  const clase = await clasificacionDe(usuarioId);
  if (clase === 'adulto') return true;
  if (clase === 'sin_fecha') return !FAMILIARES.includes(permiso);
  if (TARJETAS.includes(permiso)) return false;

  const where = { menorId: usuarioId };
  if (grupoId) where.grupoId = grupoId;
  const vinculos = await VinculoTutor.findAll({ where, attributes: ['id'] });
  if (vinculos.length === 0) return false;
  const concedidos = await PermisoMenor.count({
    where: { vinculoId: vinculos.map((v) => v.id), permiso, permitido: true },
  });
  return concedidos > 0;
}

async function exigir(usuarioId, permiso, opciones) {
  if (!(await puede(usuarioId, permiso, opciones))) {
    throw new ErrorProhibido('No tenés permiso para realizar esta acción');
  }
}

module.exports = { clasificacionDe, puede, exigir };
