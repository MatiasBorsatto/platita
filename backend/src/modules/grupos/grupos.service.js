const crypto = require('crypto');
const { sequelize } = require('../../db/sequelize');
const { Grupo, MiembroGrupo, Usuario } = require('../../db/models');
const { ErrorValidacion, ErrorConflicto, ErrorNoEncontrado } = require('../../utils/errores');

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LARGO_CODIGO = 8;

function generarCodigo() {
  let codigo = '';
  for (let i = 0; i < LARGO_CODIGO; i += 1) codigo += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return codigo;
}

async function codigoLibre() {
  for (let i = 0; i < 5; i += 1) {
    const codigo = generarCodigo();
    if (!(await Grupo.findOne({ where: { codigo } }))) return codigo;
  }
  throw new Error('No se pudo generar un código único');
}

function dto(grupo, rol) {
  return { id: grupo.id, nombre: grupo.nombre, codigo: grupo.codigo, creadoPor: grupo.creadoPor, rol };
}

async function crearGrupo(usuarioId, nombre) {
  return sequelize.transaction(async (transaction) => {
    const grupo = await Grupo.create({ nombre, codigo: await codigoLibre(), creadoPor: usuarioId }, { transaction });
    await MiembroGrupo.create({ grupoId: grupo.id, usuarioId, rol: 'admin' }, { transaction });
    return dto(grupo, 'admin');
  });
}

async function listarGruposDeUsuario(usuarioId) {
  const membresias = await MiembroGrupo.findAll({
    where: { usuarioId },
    include: [{ model: Grupo, required: true }],
    order: [[Grupo, 'nombre', 'ASC']],
  });
  return membresias.map((m) => dto(m.Grupo, m.rol));
}

async function obtenerGrupo(grupoId, rol) {
  const grupo = await Grupo.findByPk(grupoId);
  if (!grupo) throw new ErrorNoEncontrado('Grupo no encontrado');
  const miembros = await MiembroGrupo.findAll({
    where: { grupoId },
    include: [{ model: Usuario, attributes: ['id', 'nombre'] }],
    order: [['createdAt', 'ASC']],
  });
  return {
    id: grupo.id,
    nombre: grupo.nombre,
    // El código de invitación solo lo ve un admin.
    ...(rol === 'admin' ? { codigo: grupo.codigo } : {}),
    rol,
    miembros: miembros.map((m) => ({ usuarioId: m.usuarioId, nombre: m.Usuario?.nombre, rol: m.rol })),
  };
}

async function unirseConCodigo(usuarioId, codigo) {
  const grupo = await Grupo.findOne({ where: { codigo } });
  if (!grupo) throw new ErrorValidacion('Código inválido o vencido');
  try {
    await MiembroGrupo.create({ grupoId: grupo.id, usuarioId, rol: 'miembro' });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') throw new ErrorConflicto('Ya sos miembro de este grupo');
    throw err;
  }
  return { id: grupo.id, nombre: grupo.nombre, rol: 'miembro' };
}

async function regenerarCodigo(adminId, grupoId) {
  // adminId ya fue verificado por grupoAccesible('admin').
  const grupo = await Grupo.findByPk(grupoId);
  if (!grupo) throw new ErrorNoEncontrado('Grupo no encontrado');
  grupo.codigo = await codigoLibre();
  await grupo.save();
  return dto(grupo, 'admin');
}

async function esUltimoAdmin(grupoId, miembro) {
  if (miembro.rol !== 'admin') return false;
  const admins = await MiembroGrupo.count({ where: { grupoId, rol: 'admin' } });
  return admins <= 1;
}

async function quitarMiembro(adminId, grupoId, usuarioId) {
  const miembro = await MiembroGrupo.findOne({ where: { grupoId, usuarioId } });
  if (!miembro) throw new ErrorNoEncontrado('El usuario no es miembro del grupo');
  if (await esUltimoAdmin(grupoId, miembro)) {
    throw new ErrorConflicto('No se puede quitar al último administrador');
  }
  await miembro.destroy();
}

async function cambiarRol(grupoId, usuarioId, rol) {
  const miembro = await MiembroGrupo.findOne({ where: { grupoId, usuarioId } });
  if (!miembro) throw new ErrorNoEncontrado('El usuario no es miembro del grupo');
  if (rol === 'miembro' && (await esUltimoAdmin(grupoId, miembro))) {
    throw new ErrorConflicto('No se puede degradar al último administrador');
  }
  miembro.rol = rol;
  await miembro.save();
  return { id: miembro.id, usuarioId: miembro.usuarioId, rol: miembro.rol };
}

async function salirDeGrupo(usuarioId, grupoId) {
  const miembro = await MiembroGrupo.findOne({ where: { grupoId, usuarioId } });
  if (!miembro) throw new ErrorNoEncontrado('Grupo no encontrado');
  if (await esUltimoAdmin(grupoId, miembro)) {
    throw new ErrorConflicto('Sos el último administrador: designá a otro antes de salir');
  }
  await miembro.destroy();
}

module.exports = {
  crearGrupo,
  listarGruposDeUsuario,
  obtenerGrupo,
  unirseConCodigo,
  regenerarCodigo,
  quitarMiembro,
  cambiarRol,
  salirDeGrupo,
};
