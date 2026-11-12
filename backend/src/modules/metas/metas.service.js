const { fn, col, Op } = require('sequelize');
const { sequelize } = require('../../db/sequelize');
const { Meta, AporteMeta, MiembroGrupo, Movimiento } = require('../../db/models');
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

async function crearMeta(usuarioId, { nombre, montoObjetivo, fechaLimite = null, grupoId = null, moneda = 'ARS' }) {
  if (grupoId && !(await MiembroGrupo.findOne({ where: { grupoId, usuarioId } }))) {
    throw new ErrorNoEncontrado('Grupo no encontrado');
  }
  const meta = await Meta.create({ usuarioId, grupoId, nombre, montoObjetivo, fechaLimite, moneda });
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
    // Sin la meta, sus registros de aportes y retiros no tienen a qué referirse.
    await Movimiento.destroy({ where: { metaId: meta.id, tipo: TIPOS_REGISTRO_META }, transaction });
    await AporteMeta.destroy({ where: { metaId: meta.id }, transaction });
    await meta.destroy({ transaction });
  });
}

// Registros que deja en el historial de movimientos un aporte o un retiro hecho desde Metas.
// No son ingresos ni gastos: no cambian "Mi plata", las estadísticas ni los presupuestos,
// porque todas esas cuentas filtran tipo ingreso/gasto.
const TIPOS_REGISTRO_META = ['aporte_meta', 'retiro_meta'];

// monto positivo = aporte; negativo = retiro. El registro del historial queda a nombre de quien
// lo hace (en una meta de grupo, cada integrante ve sus propios aportes), en la moneda de la meta.
async function registrarAporte(usuarioId, metaId, { monto, fecha }) {
  const meta = await obtenerAccesible(usuarioId, metaId);
  const retiro = String(monto).startsWith('-');
  const aporte = await sequelize.transaction(async (transaction) => {
    const registro = await Movimiento.create({
      usuarioId,
      alcance: 'personal',
      tipo: retiro ? 'retiro_meta' : 'aporte_meta',
      monto: retiro ? String(monto).slice(1) : monto,
      moneda: meta.moneda,
      fecha,
      metaId: meta.id,
      descripcion: `${retiro ? 'Retiro de' : 'Aporte a'} la meta «${meta.nombre}»`,
    }, { transaction });
    return AporteMeta.create({ metaId: meta.id, monto, fecha, movimientoId: registro.id }, { transaction });
  });
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
  TIPOS_REGISTRO_META,
};
