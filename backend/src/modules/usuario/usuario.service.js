const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { Usuario } = require('../../db/models');
const TokenRecuperacion = require('../../db/models/token-recuperacion');
const email = require('../../services/email');
const { ErrorValidacion, ErrorConflicto, ErrorNoAutenticado } = require('../../utils/errores');

const COSTO_HASH = 12;
const VIGENCIA_TOKEN_MS = 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashearToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function validarPasswordNueva(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new ErrorValidacion('La contraseña debe tener al menos 8 caracteres');
  }
}

function publico(u) {
  return { id: u.id, nombre: u.nombre, email: u.email, preferenciasEmail: u.preferenciasEmail };
}

async function obtenerPerfil(usuarioId) {
  const u = await Usuario.findByPk(usuarioId);
  if (!u) throw new ErrorNoAutenticado('No autenticado');
  return publico(u);
}

async function actualizarPerfil(usuarioId, { nombre, email: nuevoEmail, passwordActual, passwordNueva, preferenciasEmail } = {}) {
  const u = await Usuario.findByPk(usuarioId);
  if (!u) throw new ErrorNoAutenticado('No autenticado');
  const cambios = {};

  if (nombre !== undefined) {
    if (typeof nombre !== 'string' || !nombre.trim()) throw new ErrorValidacion('El nombre es obligatorio');
    cambios.nombre = nombre.trim();
  }
  if (nuevoEmail !== undefined) {
    if (typeof nuevoEmail !== 'string' || !EMAIL_RE.test(nuevoEmail.trim())) throw new ErrorValidacion('El email no es válido');
    const normalizado = nuevoEmail.trim().toLowerCase();
    if (normalizado !== u.email) {
      if (await Usuario.findOne({ where: { email: normalizado } })) throw new ErrorConflicto('El email ya está registrado');
      cambios.email = normalizado;
    }
  }
  if (preferenciasEmail !== undefined) {
    if (typeof preferenciasEmail !== 'boolean') throw new ErrorValidacion('preferenciasEmail debe ser verdadero o falso');
    cambios.preferenciasEmail = preferenciasEmail;
  }
  if (passwordNueva !== undefined) {
    validarPasswordNueva(passwordNueva);
    const ok = typeof passwordActual === 'string' && u.passwordHash && (await bcrypt.compare(passwordActual, u.passwordHash));
    if (!ok) throw new ErrorValidacion('La contraseña actual es incorrecta');
    cambios.passwordHash = await bcrypt.hash(passwordNueva, COSTO_HASH);
  }

  try {
    await u.update(cambios);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') throw new ErrorConflicto('El email ya está registrado');
    throw err;
  }
  return publico(u);
}

async function solicitarRecuperacion(correo) {
  if (typeof correo !== 'string') return;
  const u = await Usuario.findOne({ where: { email: correo.trim().toLowerCase() } });
  if (!u) return;
  const token = crypto.randomBytes(32).toString('hex');
  await TokenRecuperacion.create({
    usuarioId: u.id,
    tokenHash: hashearToken(token),
    venceEn: new Date(Date.now() + VIGENCIA_TOKEN_MS),
  });
  const base = process.env.FRONTEND_URL || '';
  // No se espera el envío: un fallo no debe cambiar la respuesta (evita revelar qué cuentas existen).
  // El log omite el mensaje del error porque puede incluir el email o el token.
  Promise.resolve()
    .then(() =>
      email.enviarEmail({
        para: u.email,
        asunto: 'Recuperar contraseña - Platita',
        texto: `Para restablecer tu contraseña ingresá a: ${base}/restablecer?token=${token}\nEl enlace vence en una hora y solo puede usarse una vez.`,
      })
    )
    .catch((err) => console.error('Falló el envío del email de recuperación', err?.code || err?.name));
}

async function restablecerPassword(token, nuevaPassword) {
  validarPasswordNueva(nuevaPassword);
  const invalido = new ErrorValidacion('El enlace es inválido o venció');
  if (typeof token !== 'string' || !token) throw invalido;
  const tokenHash = hashearToken(token);
  const passwordHash = await bcrypt.hash(nuevaPassword, COSTO_HASH);
  // Marcar como usado es atómico: solo una solicitud puede consumir el token.
  const [filas, registros] = await TokenRecuperacion.update(
    { usadoEn: new Date() },
    { where: { tokenHash, usadoEn: null, venceEn: { [Op.gt]: new Date() } }, returning: true }
  );
  if (!filas) throw invalido;
  await Usuario.update({ passwordHash }, { where: { id: registros[0].usuarioId } });
}

module.exports = { obtenerPerfil, actualizarPerfil, solicitarRecuperacion, restablecerPassword };
