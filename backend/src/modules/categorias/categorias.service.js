const { Op } = require('sequelize');
const { Categoria } = require('../../db/models');
const { ErrorValidacion, ErrorProhibido, ErrorNoEncontrado } = require('../../utils/errores');

function normalizarNombre(nombre) {
  const limpio = typeof nombre === 'string' ? nombre.trim() : '';
  if (!limpio) throw new ErrorValidacion('El nombre es obligatorio');
  if (limpio.length > 100) throw new ErrorValidacion('El nombre es demasiado largo');
  return limpio;
}

// Devuelve la categoría propia; base -> 403, ajena o inexistente -> 404.
async function obtenerModificable(usuarioId, id) {
  const categoria = await Categoria.findOne({
    where: { id, [Op.or]: [{ usuarioId }, { usuarioId: null }] },
  });
  if (!categoria) throw new ErrorNoEncontrado('Categoría no encontrada');
  if (categoria.usuarioId === null) throw new ErrorProhibido('Las categorías base no se pueden modificar');
  return categoria;
}

async function listarCategorias(usuarioId) {
  return Categoria.findAll({
    where: { archivada: false, [Op.or]: [{ usuarioId }, { usuarioId: null }] },
    order: [['nombre', 'ASC']],
  });
}

async function crearCategoria(usuarioId, { nombre } = {}) {
  return Categoria.create({ nombre: normalizarNombre(nombre), usuarioId });
}

async function editarCategoria(usuarioId, id, datos = {}) {
  const categoria = await obtenerModificable(usuarioId, id);
  categoria.nombre = normalizarNombre(datos.nombre);
  await categoria.save();
  return categoria;
}

async function archivarCategoria(usuarioId, id) {
  const categoria = await obtenerModificable(usuarioId, id);
  categoria.archivada = true;
  await categoria.save();
  return categoria;
}

module.exports = { listarCategorias, crearCategoria, editarCategoria, archivarCategoria };
