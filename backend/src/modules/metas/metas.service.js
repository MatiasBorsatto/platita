const { fn, col, Op } = require('sequelize');
const { sequelize } = require('../../db/sequelize');
const { Meta, AporteMeta, MiembroGrupo } = require('../../db/models');
const { ErrorNoEncontrado, ErrorValidacion } = require('../../utils/errores');
const { progresoMeta } = require('./metas.calculo');

async function obtenerPropia(usuarioId, id, opciones = {}) {
  const meta = await Meta.findOne({ where: { id, usuarioId }, ...opciones });
  if (!meta) throw new ErrorNoEncontrado('Meta no encontrada');
  return meta;
}

async function gruposDe(usuarioId) {
  const miembros = await MiembroGrupo.findAll({ where: { usuarioId }, attributes: ['grupoId'] });
  return miembros.map((m) => m.grupoId);
}

// Metas propias o de un grupo del que el usuario es miembro (progreso compartido).
async function obtenerAccesible(usuarioId, id) {
  const meta = await Meta.findOne({
    where: { id, [Op.or]: [{ usuarioId }, { grupoId: await gruposDe(usuarioId) }] },
  });
  if (!meta) throw new ErrorNoEncontrado('Meta no encontrada');
  return meta;
}

// SUM de DECIMAL en Postgres es exacto y llega como string.
async function acumuladosPorMeta(metaIds) {
  const filas = await AporteMeta.findAll({
    attributes: ['metaId', [fn('SUM', col('monto')), 'total']],
    where: { metaId: metaIds },
    group: ['metaId'],
    raw: true,
  });
  return new Map(filas.map((f) => [f.metaId, f.total]));
}

function conProgreso(meta, acumulado = '0.00') {
  return {
    ...meta.toJSON(),
    acumulado,
    ...progresoMeta({ montoObjetivo: meta.montoObjetivo, acumulado }),
  };
}

async function vistaDe(meta) {
  const acumulados = await acumuladosPorMeta([meta.id]);
  return conProgreso(meta, acumulados.get(meta.id));
}

async function crearMeta(usuarioId, { nombre, montoObjetivo, fechaLimite = null, grupoId = null }) {
  if (grupoId && !(await MiembroGrupo.findOne({ where: { grupoId, usuarioId } }))) {
    throw new ErrorNoEncontrado('Grupo no encontrado');
  }
  const meta = await Meta.create({ usuarioId, grupoId, nombre, montoObjetivo, fechaLimite });
  return vistaDe(meta);
}

async function listarMetas(usuarioId) {
  const metas = await Meta.findAll({
    where: { [Op.or]: [{ usuarioId }, { grupoId: await gruposDe(usuarioId) }] },
    order: [['createdAt', 'DESC'], ['id', 'ASC']],
  });
  const acumulados = await acumuladosPorMeta(metas.map((m) => m.id));
  return metas.map((m) => conProgreso(m, acumulados.get(m.id)));
}

async function editarMeta(usuarioId, id, datos) {
  const meta = await obtenerPropia(usuarioId, id);
  Object.assign(meta, datos);
  await meta.save();
  return vistaDe(meta);
}

async function eliminarMeta(usuarioId, id) {
  const meta = await obtenerPropia(usuarioId, id);
  await sequelize.transaction(async (transaction) => {
    await AporteMeta.destroy({ where: { metaId: meta.id }, transaction });
    await meta.destroy({ transaction });
  });
}

// monto positivo = aporte; negativo = retiro.
async function registrarAporte(usuarioId, metaId, { monto, fecha }) {
  const meta = await obtenerAccesible(usuarioId, metaId);
  const aporte = await AporteMeta.create({ metaId: meta.id, monto, fecha });
  return { aporte, meta: await vistaDe(meta) };
}

// Lo llama crearMovimiento dentro de su transacción: ingreso suma, gasto retira.
async function registrarAporteDeMovimiento(usuarioId, movimiento, transaction) {
  const meta = await obtenerPropia(usuarioId, movimiento.metaId, { transaction });
  if (movimiento.tipo !== 'ingreso' && movimiento.tipo !== 'gasto') {
    throw new ErrorValidacion('Solo ingresos y gastos pueden asociarse a una meta');
  }
  const monto = movimiento.tipo === 'ingreso' ? movimiento.monto : `-${movimiento.monto}`;
  return AporteMeta.create(
    { metaId: meta.id, monto, fecha: movimiento.fecha, movimientoId: movimiento.id },
    { transaction }
  );
}

module.exports = {
  crearMeta,
  listarMetas,
  editarMeta,
  eliminarMeta,
  registrarAporte,
  registrarAporteDeMovimiento,
  obtenerPropia,
};
