const email = require('../../services/email');
const { Notificacion, Usuario } = require('../../db/models');
const { ErrorNoEncontrado } = require('../../utils/errores');

// Crea la notificación una sola vez por (presupuesto, alerta). El email es opcional y nunca rompe el flujo.
async function registrarAlertaPresupuesto(usuarioId, presupuestoId, alerta, mensaje) {
  const [notificacion, creada] = await Notificacion.findOrCreate({
    where: { presupuestoId, alerta },
    defaults: { usuarioId, mensaje },
  });
  if (!creada) return notificacion;
  // Sin contenido del mensaje, ni el email, ni secretos en los logs.
  const registrarFallo = (err) =>
    console.error('No se pudo enviar el aviso por email de la alerta de presupuesto:', err && err.name);
  try {
    const usuario = await Usuario.findByPk(usuarioId);
    if (usuario && usuario.preferenciasEmail) {
      // Sin await: la respuesta HTTP no espera al SMTP.
      Promise.resolve(email.enviarEmail({ para: usuario.email, asunto: 'Alerta de presupuesto', texto: mensaje }))
        .catch(registrarFallo);
    }
  } catch (err) {
    registrarFallo(err);
  }
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

module.exports = { registrarAlertaPresupuesto, listarNotificaciones, marcarLeida };
