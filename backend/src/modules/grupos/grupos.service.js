const crypto = require('crypto');
const { sequelize } = require('../../db/sequelize');
const { Op } = require('sequelize');
const { Grupo, MiembroGrupo, Usuario, VinculoTutor, RegistroAuditoria } = require('../../db/models');
const { saldosDelGrupo } = require('../saldos/saldos.service');
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

// El código de invitación solo lo ve un admin, igual que en obtenerGrupo.
function dto(grupo, rol) {
  return {
    id: grupo.id,
    nombre: grupo.nombre,
    ...(rol === 'admin' ? { codigo: grupo.codigo } : {}),
    creadoPor: grupo.creadoPor,
    rol,
  };
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

// Un integrante con deudas o créditos sin saldar no puede irse: su saldo quedaría huérfano en el grupo.
async function exigirSaldoCero(grupoId, usuarioId, mensaje) {
  const saldos = await saldosDelGrupo(usuarioId, grupoId);
  if (saldos.some((s) => s.usuarioId === usuarioId && s.saldo !== '0.00')) throw new ErrorConflicto(mensaje);
}

// Quita al integrante y, en la misma transacción, los vínculos tutor-menor del grupo en los que participa:
// el control parental existe solo dentro del grupo. Cada vínculo eliminado queda en la auditoría.
async function retirar(miembro, autorId) {
  const { grupoId, usuarioId } = miembro;
  await sequelize.transaction(async (transaction) => {
    const vinculos = await VinculoTutor.findAll({
      where: { grupoId, [Op.or]: [{ menorId: usuarioId }, { tutorId: usuarioId }] },
      transaction,
    });
    for (const v of vinculos) {
      // Se registra a nombre del tutor para que lo vea en la actividad del menor; autorId dice quién lo provocó.
      await RegistroAuditoria.create({
        usuarioId: v.tutorId, accion: 'vinculo.eliminado', entidad: 'vinculo_tutor', entidadId: v.id,
        detalle: { menorId: v.menorId, tutorId: v.tutorId, grupoId, autorId, motivo: 'salida_del_grupo' },
      }, { transaction });
      await v.destroy({ transaction });
    }
    await miembro.destroy({ transaction });
  });
}

async function quitarMiembro(adminId, grupoId, usuarioId) {
  const miembro = await MiembroGrupo.findOne({ where: { grupoId, usuarioId } });
  if (!miembro) throw new ErrorNoEncontrado('El usuario no es miembro del grupo');
  if (await esUltimoAdmin(grupoId, miembro)) {
    throw new ErrorConflicto('No se puede quitar al último administrador');
  }
  await exigirSaldoCero(grupoId, usuarioId, 'Tiene saldos pendientes en el grupo: registren los pagos antes de quitarlo');
  await retirar(miembro, adminId);
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
  await exigirSaldoCero(grupoId, usuarioId, 'Tenés saldos pendientes en el grupo: registrá los pagos antes de salir');
  await retirar(miembro, usuarioId);
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
