const nodemailer = require('nodemailer');

let transporte;

// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS y EMAIL_FROM vienen del entorno.
// La verificación del certificado TLS queda en su valor por defecto (activada).
function obtenerTransporte() {
  if (!transporte) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST) throw new Error('Falta la variable de entorno SMTP_HOST');
    const port = Number(SMTP_PORT) || 587;
    transporte = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }
  return transporte;
}

async function enviarEmail({ para, asunto, texto }) {
  await obtenerTransporte().sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: para,
    subject: asunto,
    text: texto,
  });
}

module.exports = { enviarEmail };
