const { Tarjeta, Compra } = require('../../db/models');
const { ErrorNoEncontrado, ErrorConflicto } = require('../../utils/errores');

async function obtenerPropia(usuarioId, id) {
  const t = await Tarjeta.findOne({ where: { id, usuarioId } });
  if (!t) throw new ErrorNoEncontrado('Tarjeta no encontrada');
  return t;
}

function listarTarjetas(usuarioId) {
  return Tarjeta.findAll({ where: { usuarioId }, order: [['nombre', 'ASC'], ['id', 'ASC']] });
}

function crearTarjeta(usuarioId, datos) {
  return Tarjeta.create({ ...datos, usuarioId });
}

async function editarTarjeta(usuarioId, id, datos) {
  const t = await obtenerPropia(usuarioId, id);
  Object.assign(t, datos);
  await t.save();
  return t;
}

async function eliminarTarjeta(usuarioId, id) {
  const t = await obtenerPropia(usuarioId, id);
  if ((await Compra.count({ where: { tarjetaId: id, usuarioId } })) > 0) {
    throw new ErrorConflicto('La tarjeta tiene compras registradas');
  }
  await t.destroy();
}

module.exports = { listarTarjetas, crearTarjeta, editarTarjeta, eliminarTarjeta, obtenerPropia };
