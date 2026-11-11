const { Op, fn, col } = require('sequelize');
const { sequelize } = require('../../db/sequelize');
const { Movimiento, Categoria, AporteMeta, AporteGasto } = require('../../db/models');
const metasService = require('../metas/metas.service');
const { ErrorNoEncontrado, ErrorValidacion, ErrorConflicto } = require('../../utils/errores');
const { diaValido, hoyBA } = require('../../utils/fechas');
const { aCentavos, deCentavos } = require('../../utils/dinero');

// La categoría debe ser base o del propio usuario.
async function verificarCategoria(usuarioId, categoriaId) {
  if (!categoriaId) return;
  const cat = await Categoria.findOne({
    where: { id: categoriaId, [Op.or]: [{ usuarioId }, { usuarioId: null }] },
  });
  if (!cat) throw new ErrorValidacion('Categoría inválida');
}

// Valida las categorías de varios participantes con una sola consulta. Cada uno solo puede usar
// sus propias categorías o las base.
async function verificarCategoriasDe(pares) {
  const pedidas = pares.filter((p) => p.categoriaId);
  if (pedidas.length === 0) return;
  const cats = await Categoria.findAll({
    where: {
      id: [...new Set(pedidas.map((p) => p.categoriaId))],
      [Op.or]: [{ usuarioId: [...new Set(pedidas.map((p) => p.usuarioId))] }, { usuarioId: null }],
    },
    attributes: ['id', 'usuarioId'],
  });
  const validas = new Set(cats.map((c) => `${c.id}|${c.usuarioId ?? ''}`));
  for (const p of pedidas) {
    if (!validas.has(`${p.categoriaId}|${p.usuarioId}`) && !validas.has(`${p.categoriaId}|`)) {
      throw new ErrorValidacion('Categoría inválida');
    }
  }
}

// Un movimiento solo aporta a una meta de su misma moneda: no hay conversión.
function exigirMismaMoneda(monedaMovimiento, monedaMeta) {
  if (monedaMovimiento !== monedaMeta) {
    throw new ErrorValidacion(`La meta es en ${monedaMeta} y el movimiento en ${monedaMovimiento}`);
  }
}

async function obtenerPropio(usuarioId, id) {
  const mov = await Movimiento.findOne({ where: { id, usuarioId, alcance: 'personal' } });
  if (!mov) throw new ErrorNoEncontrado('Movimiento no encontrado');
  if (mov.gastoFijoId) {
    throw new ErrorConflicto('Este movimiento viene de un gasto fijo. Deshacé el pago desde Gastos fijos.');
  }
  return mov;
}

async function crearMovimiento(usuarioId, datos) {
  await verificarCategoria(usuarioId, datos.categoriaId);
  if (!datos.metaId) return Movimiento.create({ ...datos, usuarioId, alcance: 'personal' });

  // Con metaId, el aporte a la meta se crea en la misma transacción que el movimiento.
  const meta = await metasService.obtenerPropia(usuarioId, datos.metaId);
  exigirMismaMoneda(datos.moneda ?? 'ARS', meta.moneda);
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
  if (datos.moneda !== undefined) {
    const meta = await metasService.obtenerPropia(usuarioId, mov.metaId);
    exigirMismaMoneda(datos.moneda, meta.moneda);
  }
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

// Sequelize devuelve SUM(DECIMAL) como texto; se normaliza a centavos enteros.
function centavosDeSuma(valor) {
  if (valor === null || valor === undefined) return 0n;
  const [entero, decimal = ''] = String(valor).split('.');
  return BigInt(entero || '0') * 100n + BigInt((decimal + '00').slice(0, 2));
}

const conSigno = (c) => (c < 0n ? `-${deCentavos(-c)}` : deCentavos(c));

// Mi plata: ingresos personales - gastos personales - aportes reales a gastos compartidos.
// Los movimientos con fecha futura todavía no afectan el dinero disponible.
// Nunca se mezclan monedas: los campos de primer nivel son en pesos y cada moneda va en porMoneda.
async function dineroActual(usuarioId) {
  const hoy = hoyBA();
  const hastaHoy = { [Op.lte]: hoy };
  const [sumas, aportes] = await Promise.all([
    Movimiento.findAll({
      attributes: ['moneda', 'tipo', [fn('SUM', col('monto')), 'total']],
      where: { usuarioId, alcance: 'personal', tipo: ['ingreso', 'gasto'], fecha: hastaHoy },
      group: ['moneda', 'tipo'],
      raw: true,
    }),
    AporteGasto.findAll({
      attributes: ['monto'],
      where: { usuarioId, fecha: hastaHoy },
      include: [{ model: Movimiento, attributes: ['moneda'], required: true }],
    }),
  ]);

  const porMoneda = new Map();
  const de = (moneda) => {
    if (!porMoneda.has(moneda)) porMoneda.set(moneda, { ing: 0n, personales: 0n, compartidos: 0n });
    return porMoneda.get(moneda);
  };
  for (const s of sumas) {
    if (s.tipo === 'ingreso') de(s.moneda).ing += centavosDeSuma(s.total);
    else de(s.moneda).personales += centavosDeSuma(s.total);
  }
  for (const a of aportes) de(a.Movimiento.moneda).compartidos += centavosDeSuma(a.monto);
  de('ARS');

  const resumen = (moneda) => {
    const { ing, personales, compartidos } = porMoneda.get(moneda);
    const gastos = personales + compartidos;
    return {
      moneda,
      dineroActual: conSigno(ing - gastos),
      ingresos: deCentavos(ing),
      gastos: deCentavos(gastos),
      gastosPersonales: deCentavos(personales),
      gastosCompartidos: deCentavos(compartidos),
    };
  };
  const monedas = [...porMoneda.keys()].sort((a, b) => (a === 'ARS' ? -1 : b === 'ARS' ? 1 : a.localeCompare(b)));
  const { moneda, ...pesos } = resumen('ARS');
  return { ...pesos, fechaCorte: hoy, porMoneda: monedas.map(resumen) };
}

module.exports = {
  verificarCategoriasDe,
  crearMovimiento,
  editarMovimiento,
  eliminarMovimiento,
  listarMovimientos,
  dineroActual,
  rangoDelMes,
  verificarCategoria,
};
