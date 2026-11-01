const { OAuth2Client } = require('google-auth-library');
const { Usuario } = require('../../db/models');
const { ErrorNoAutenticado, ErrorValidacion } = require('../../utils/errores');
const { emitirTokens } = require('./auth.service');

const MENSAJE_INVALIDO = 'Token de Google inválido';

// Verifica firma, audiencia y expiración del ID token contra los certificados de Google.
async function verificarIdToken(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Falta la variable de entorno GOOGLE_CLIENT_ID');
  let payload;
  try {
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    throw new ErrorNoAutenticado(MENSAJE_INVALIDO);
  }
  // Sin email verificado no se puede vincular una cuenta existente por email.
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new ErrorNoAutenticado(MENSAJE_INVALIDO);
  }
  return { googleId: payload.sub, email: payload.email, nombre: payload.name || payload.email };
}

async function loginConGoogle(idToken, verificar = verificarIdToken) {
  if (typeof idToken !== 'string' || !idToken) throw new ErrorValidacion('El idToken es obligatorio');
  const perfil = await verificar(idToken);
  const email = perfil.email.trim().toLowerCase();

  let usuario = await Usuario.findOne({ where: { googleId: perfil.googleId } });
  if (!usuario) {
    usuario = await Usuario.findOne({ where: { email } });
    if (usuario) {
      await usuario.update({ googleId: perfil.googleId });
    } else {
      usuario = await Usuario.create({ nombre: perfil.nombre, email, googleId: perfil.googleId });
    }
  }
  return emitirTokens(usuario);
}

module.exports = { verificarIdToken, loginConGoogle };
