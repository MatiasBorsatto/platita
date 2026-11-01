const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../../db/sequelize');
const { Grupo, MiembroGrupo, Usuario, Invitacion } = require('../../db/models');
const email = require('../../services/email');
const { ErrorValidacion, ErrorConflicto, ErrorNoEncontrado, ErrorProhibido } = require('../../utils/errores');

const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashearToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function normalizar(correo) {
  return typeof correo === 'string' ? correo.trim().toLowerCase() : '';
}

function dto(inv) {
  return { id: inv.id, grupoId: inv.grupoId, email: inv.email, estado: inv.estado, expiraEn: inv.expiraEn };
}

// adminId ya fue verificado por grupoAccesible('admin').
async function invitar(adminId, grupoId, correo) {
  const destino = normalizar(correo);
  if (!destino || destino.length > 254 || !EMAIL.test(destino)) throw new ErrorValidacion('email inválido');
  const grupo = await Grupo.findByPk(grupoId);
  if (!grupo) throw new ErrorNoEncontrado('Grupo no encontrado');

  const usuario = await Usuario.findOne({ where: { email: destino } });
  if (usuario && (await MiembroGrupo.findOne({ where: { grupoId, usuarioId: usuario.id } }))) {
    throw new ErrorConflicto('Ese usuario ya es miembro del grupo');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const inv = await sequelize.transaction(async (transaction) => {
    // Una sola invitación vigente por email: la anterior deja de servir.
    await Invitacion.update(
      { estado: 'cancelada' },
      { where: { grupoId, email: destino, estado: 'pendiente' }, transaction }
    );
    return Invitacion.create(
      { grupoId, email: destino, token: hashearToken(token), expiraEn: new Date(Date.now() + VIGENCIA_MS) },
      { transaction }
    );
  });

  const base = process.env.FRONTEND_URL || '';
  // No se espera el envío; el log omite el mensaje del error porque puede incluir el email o el token.
  Promise.resolve()
    .then(() =>
      email.enviarEmail({
        para: destino,
        asunto: `Invitación al grupo ${grupo.nombre} - Platita`,
        texto: `Te invitaron al grupo "${grupo.nombre}". Para aceptar ingresá a: ${base}/invitaciones/aceptar?token=${token}\nEl enlace vence en 7 días y solo puede usarse una vez.`,
      })
    )
    .catch((err) => console.error('Falló el envío del email de invitación', err?.name));

  return dto(inv);
}

async function aceptarInvitacion(usuarioId, token) {
  const invalida = new ErrorValidacion('La invitación es inválida o venció');
  if (typeof token !== 'string' || !token) throw invalida;
  const inv = await Invitacion.findOne({ where: { token: hashearToken(token) } });
  if (!inv || inv.estado !== 'pendiente') throw invalida;

  const usuario = await Usuario.findByPk(usuarioId);
  if (!usuario || normalizar(usuario.email) !== normalizar(inv.email)) {
    throw new ErrorProhibido('Esta invitación es para otro email');
  }
  if (inv.expiraEn <= new Date()) {
    await inv.update({ estado: 'expirada' });
    throw invalida;
  }

  return sequelize.transaction(async (transaction) => {
    // Consumir es atómico: solo una solicitud puede aceptar la invitación.
    const [filas] = await Invitacion.update(
      { estado: 'aceptada' },
      { where: { id: inv.id, estado: 'pendiente', expiraEn: { [Op.gt]: new Date() } }, transaction }
    );
    if (!filas) throw invalida;
    try {
      await MiembroGrupo.create({ grupoId: inv.grupoId, usuarioId, rol: 'miembro' }, { transaction });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') throw new ErrorConflicto('Ya sos miembro de este grupo');
      throw err;
    }
    const grupo = await Grupo.findByPk(inv.grupoId, { transaction });
    return { id: grupo.id, nombre: grupo.nombre, rol: 'miembro' };
  });
}

async function cancelarInvitacion(adminId, invitacionId, grupoId) {
  const inv = await Invitacion.findOne({ where: { id: invitacionId, grupoId } });
  if (!inv) throw new ErrorNoEncontrado('Invitación no encontrada');
  if (inv.estado !== 'pendiente') throw new ErrorConflicto('La invitación ya no está pendiente');
  await inv.update({ estado: 'cancelada' });
}

module.exports = { invitar, aceptarInvitacion, cancelarInvitacion };
