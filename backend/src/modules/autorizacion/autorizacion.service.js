const { Usuario, VinculoTutor, PermisoMenor, MiembroGrupo } = require('../../db/models');
const { ErrorProhibido, ErrorValidacion } = require('../../utils/errores');
const { hoyBA } = require('../../utils/fechas');
const { clasificar } = require('./clasificacion');
const { TODOS, TARJETAS, FAMILIARES } = require('./permisos');

// Clasificación calculada en el backend a partir de la base. Nunca viene del cliente.
async function clasificacionDe(usuarioId) {
  const usuario = await Usuario.findByPk(usuarioId, { attributes: ['fechaNacimiento'] });
  return clasificar(usuario?.fechaNacimiento ?? null, hoyBA().slice(0, 10));
}

// Decide si un usuario puede ejercer un permiso.
// - Adulto: todo.
// - Menor sin ningún tutor vinculado: solo funciones personales (nada familiar ni de tarjetas).
// - Menor con tutor: solo lo que algún tutor (del grupo indicado, si se pasa) concedió explícitamente.
async function puede(usuarioId, permiso, { grupoId = null } = {}) {
  if (!TODOS.includes(permiso)) throw new ErrorValidacion(`Permiso desconocido: ${permiso}`);
  const clase = await clasificacionDe(usuarioId);
  if (clase === 'adulto') return true;
  if (clase === 'sin_fecha') return !FAMILIARES.includes(permiso);
  if (TARJETAS.includes(permiso)) return false;

  const todos = await VinculoTutor.findAll({ where: { menorId: usuarioId }, attributes: ['id', 'grupoId'] });
  // Solo cuentan los vínculos de grupos en los que el menor sigue siendo miembro.
  const grupos = todos.length
    ? new Set((await MiembroGrupo.findAll({ where: { usuarioId, grupoId: todos.map((v) => v.grupoId) }, attributes: ['grupoId'] })).map((m) => m.grupoId))
    : new Set();
  const vinculos = todos.filter((v) => grupos.has(v.grupoId));
  if (vinculos.length === 0) return !FAMILIARES.includes(permiso);
  const aplicables = grupoId ? vinculos.filter((v) => v.grupoId === grupoId) : vinculos;
  if (aplicables.length === 0) return false;
  const concedidos = await PermisoMenor.count({
    where: { vinculoId: aplicables.map((v) => v.id), permiso, permitido: true },
  });
  return concedidos > 0;
}

async function exigir(usuarioId, permiso, opciones) {
  if (!(await puede(usuarioId, permiso, opciones))) {
    throw new ErrorProhibido('No tenés permiso para realizar esta acción');
  }
}

module.exports = { clasificacionDe, puede, exigir };
