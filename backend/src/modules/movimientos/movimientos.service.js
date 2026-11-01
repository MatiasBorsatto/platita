const { Op } = require('sequelize');
const { sequelize } = require('../../db/sequelize');
const { Movimiento, Categoria, AporteMeta } = require('../../db/models');
const metasService = require('../metas/metas.service');
const { ErrorNoEncontrado, ErrorValidacion } = require('../../utils/errores');
const { diaValido } = require('../../utils/fechas');

// La categoría debe ser base o del propio usuario.
async function verificarCategoria(usuarioId, categoriaId) {
  if (!categoriaId) return;
  const cat = await Categoria.findOne({
    where: { id: categoriaId, [Op.or]: [{ usuarioId }, { usuarioId: null }] },
  });
  if (!cat) throw new ErrorValidacion('Categoría inválida');
}

async function obtenerPropio(usuarioId, id) {
  const mov = await Movimiento.findOne({ where: { id, usuarioId, alcance: 'personal' } });
  if (!mov) throw new ErrorNoEncontrado('Movimiento no encontrado');
  return mov;
}

async function crearMovimiento(usuarioId, datos) {
  await verificarCategoria(usuarioId, datos.categoriaId);
  if (!datos.metaId) return Movimiento.create({ ...datos, usuarioId, alcance: 'personal' });

  // Con metaId, el aporte a la meta se crea en la misma transacción que el movimiento.
  await metasService.obtenerPropia(usuarioId, datos.metaId);
  return sequelize.transaction(async (transaction) => {
    const mov = await Movimiento.create({ ...datos, usuarioId, alcance: 'personal' }, { transaction });
    await metasService.registrarAporteDeMovimiento(usuarioId, mov, transaction);
    return mov;
  });
}

async function editarMovimiento(usuarioId, id, datos) {
  const mov = await obtenerPropio(usuarioId, id);
  await verificarCategoria(usuarioId, datos.categoriaId);
  if (!mov.metaId) {
    Object.assign(mov, datos);
    await mov.save();
    return mov;
  }
  // Con meta, el aporte vinculado se actualiza en la misma transacción (gasto retira, ingreso suma).
  return sequelize.transaction(async (transaction) => {
    Object.assign(mov, datos);
    await mov.save({ transaction });
    await AporteMeta.update(
      { monto: mov.tipo === 'ingreso' ? mov.monto : `-${mov.monto}` },
      { where: { movimientoId: mov.id }, transaction }
    );
    return mov;
  });
}

async function eliminarMovimiento(usuarioId, id) {
  const mov = await obtenerPropio(usuarioId, id);
  await mov.destroy();
}

// fecha es DATEONLY (texto YYYY-MM-DD, sin zona horaria): el mes se filtra por rango de texto.
function rangoDelMes(mes) {
  const [anio, m] = mes.split('-').map(Number);
  const ultimo = diaValido(anio, m, 31);
  return [`${mes}-01`, `${mes}-${String(ultimo).padStart(2, '0')}`];
}

async function listarMovimientos(usuarioId, { mes, categoriaId, tipo, page = 1, limit = 20 } = {}) {
  const where = { usuarioId, alcance: 'personal' };
  if (mes) where.fecha = { [Op.between]: rangoDelMes(mes) };
  if (categoriaId) where.categoriaId = categoriaId;
  if (tipo) where.tipo = tipo;
  const { rows, count } = await Movimiento.findAndCountAll({
    where,
    order: [['fecha', 'DESC'], ['createdAt', 'DESC'], ['id', 'ASC']],
    limit,
    offset: (page - 1) * limit,
  });
  return { items: rows, total: count };
}

module.exports = {
  crearMovimiento,
  editarMovimiento,
  eliminarMovimiento,
  listarMovimientos,
  rangoDelMes,
  verificarCategoria,
};
