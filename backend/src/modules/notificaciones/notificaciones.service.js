const email = require('../../services/email');
const { Notificacion, Usuario } = require('../../db/models');
const { ErrorNoEncontrado } = require('../../utils/errores');

function avisarPorEmail(usuarioId, asunto, mensaje) {
  // Sin contenido del mensaje, ni el email, ni secretos en los logs.
  const registrarFallo = (err) => console.error('No se pudo enviar el aviso por email:', err && err.name);
  return (async () => {
    const usuario = await Usuario.findByPk(usuarioId);
    if (usuario && usuario.preferenciasEmail) {
      // Sin await: la respuesta HTTP no espera al SMTP.
      Promise.resolve(email.enviarEmail({ para: usuario.email, asunto, texto: mensaje })).catch(registrarFallo);
    }
  })().catch(registrarFallo);
}

// Crea la notificación una sola vez por (presupuesto, alerta).
async function registrarAlertaPresupuesto(usuarioId, presupuestoId, alerta, mensaje) {
  const [notificacion, creada] = await Notificacion.findOrCreate({
    where: { presupuestoId, alerta },
    defaults: { usuarioId, tipo: 'presupuesto', mensaje },
  });
  if (!creada) return notificacion;
  avisarPorEmail(usuarioId, 'Alerta de presupuesto', mensaje);
  return notificacion;
}

// Crea la notificación una sola vez por (cuota, alerta): 'proximo' o 'vencido'.
async function registrarAlertaVencimiento(usuarioId, cuotaGastoFijoId, alerta, mensaje) {
  const [notificacion, creada] = await Notificacion.findOrCreate({
    where: { cuotaGastoFijoId, alerta },
    defaults: { usuarioId, tipo: 'vencimiento', mensaje },
  });
  if (!creada) return notificacion;
  avisarPorEmail(usuarioId, 'Tenemos que pagar', mensaje);
  return notificacion;
}

async function listarNotificaciones(usuarioId) {
  return Notificacion.findAll({ where: { usuarioId }, order: [['createdAt', 'DESC'], ['id', 'ASC']], limit: 50 });
}

async function marcarLeida(usuarioId, id) {
  const n = await Notificacion.findOne({ where: { id, usuarioId } });
  if (!n) throw new ErrorNoEncontrado('Notificación no encontrada');
  await n.update({ leida: true });
  return n;
}

module.exports = {
  registrarAlertaPresupuesto,
  registrarAlertaVencimiento,
  listarNotificaciones,
  marcarLeida,
};
