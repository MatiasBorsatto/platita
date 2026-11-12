const { Op } = require('sequelize');
const { Movimiento, ParticipacionGasto, Categoria, Meta, AporteMeta } = require('../../db/models');
const { sumar } = require('../../utils/dinero');
const { rangoDelMes } = require('../movimientos/movimientos.service');
const { calcularEstadosPresupuestos } = require('../presupuestos/presupuestos.service');
const { calcularResumen } = require('./resumenMensual.calculo');

// Solo datos del usuario: sus movimientos personales y su parte (ParticipacionGasto) en gastos
// compartidos. Nunca el monto completo de un compartido, para no contar de más.
async function lineasDelMes(usuarioId, mes) {
  const fecha = { [Op.between]: rangoDelMes(mes) };
  const personales = await Movimiento.findAll({
    where: { usuarioId, alcance: 'personal', tipo: ['ingreso', 'gasto'], fecha },
    attributes: ['tipo', 'monto', 'categoriaId', 'moneda'],
  });
  const partes = await ParticipacionGasto.findAll({
    where: { usuarioId },
    attributes: ['monto', 'categoriaId'],
    include: [{
      model: Movimiento,
      required: true,
      attributes: ['moneda'],
      where: { tipo: 'gasto', alcance: 'compartido', fecha },
    }],
  });
  const lineas = [
    ...personales.map((m) => ({ tipo: m.tipo, monto: m.monto, categoriaId: m.categoriaId, moneda: m.moneda })),
    ...partes.map((p) => ({ tipo: 'gasto', monto: p.monto, categoriaId: p.categoriaId, moneda: p.Movimiento.moneda })),
  ];
  const catIds = [...new Set(lineas.map((l) => l.categoriaId).filter(Boolean))];
  const categorias = catIds.length ? await Categoria.findAll({ where: { id: catIds }, attributes: ['id', 'nombre'] }) : [];
  const nombres = new Map(categorias.map((c) => [c.id, c.nombre]));
  return lineas.map((l) => ({ ...l, nombre: nombres.get(l.categoriaId) ?? null }));
}

// Informativo: aportes (netos de retiros) del mes a las metas propias del usuario.
async function aportesDelMes(usuarioId, mes) {
  const metas = await Meta.findAll({ where: { usuarioId, moneda: 'ARS' }, attributes: ['id'] });
  if (metas.length === 0) return '0.00';
  const aportes = await AporteMeta.findAll({
    where: { metaId: metas.map((m) => m.id), fecha: { [Op.between]: rangoDelMes(mes) } },
    attributes: ['monto'],
  });
  return sumar(aportes.map((a) => a.monto));
}

// Un resumen por moneda, sin convertir entre ellas.
function resumenPorMoneda(lineas) {
  const grupos = new Map();
  for (const l of lineas) {
    if (!grupos.has(l.moneda)) grupos.set(l.moneda, []);
    grupos.get(l.moneda).push(l);
  }
  return [...grupos].map(([moneda, ls]) => ({ moneda, ...calcularResumen(ls, []) }));
}

// Mismas líneas que lineasDelMes, pero para todo un rango de meses en una sola consulta.
// Cada línea trae su mes (AAAA-MM) para agruparla en memoria.
async function lineasDelRango(usuarioId, desde, hasta) {
  const fecha = { [Op.between]: [rangoDelMes(desde)[0], rangoDelMes(hasta)[1]] };
  const personales = await Movimiento.findAll({
    where: { usuarioId, alcance: 'personal', tipo: ['ingreso', 'gasto'], fecha },
    attributes: ['tipo', 'monto', 'categoriaId', 'fecha', 'moneda'],
  });
  const partes = await ParticipacionGasto.findAll({
    where: { usuarioId },
    attributes: ['monto', 'categoriaId'],
    include: [{
      model: Movimiento,
      required: true,
      attributes: ['fecha', 'moneda'],
      where: { tipo: 'gasto', alcance: 'compartido', fecha },
    }],
  });
  const lineas = [
    ...personales.map((m) => ({ mes: m.fecha.slice(0, 7), tipo: m.tipo, monto: m.monto, categoriaId: m.categoriaId, moneda: m.moneda })),
    ...partes.map((p) => ({ mes: p.Movimiento.fecha.slice(0, 7), tipo: 'gasto', monto: p.monto, categoriaId: p.categoriaId, moneda: p.Movimiento.moneda })),
  ];
  const catIds = [...new Set(lineas.map((l) => l.categoriaId).filter(Boolean))];
  const categorias = catIds.length ? await Categoria.findAll({ where: { id: catIds }, attributes: ['id', 'nombre'] }) : [];
  const nombres = new Map(categorias.map((c) => [c.id, c.nombre]));
  return lineas.map((l) => ({ ...l, nombre: nombres.get(l.categoriaId) ?? null }));
}

// Mismos aportes que aportesDelMes, agrupados por mes en una sola consulta.
async function aportesDelRango(usuarioId, desde, hasta) {
  const porMes = new Map();
  const metas = await Meta.findAll({ where: { usuarioId }, attributes: ['id', 'moneda'] });
  if (metas.length === 0) return porMes;
  const monedaDeMeta = new Map(metas.map((m) => [m.id, m.moneda]));
  const aportes = await AporteMeta.findAll({
    where: { metaId: metas.map((m) => m.id), fecha: { [Op.between]: [rangoDelMes(desde)[0], rangoDelMes(hasta)[1]] } },
    attributes: ['monto', 'fecha', 'metaId'],
  });
  for (const a of aportes) {
    const clave = `${a.fecha.slice(0, 7)}|${monedaDeMeta.get(a.metaId)}`;
    if (!porMes.has(clave)) porMes.set(clave, []);
    porMes.get(clave).push(a.monto);
  }
  return new Map([...porMes].map(([clave, montos]) => [clave, sumar(montos)]));
}

async function resumenMensual(usuarioId, mes) {
  const [lineas, presupuestos, aportes] = await Promise.all([
    lineasDelMes(usuarioId, mes),
    calcularEstadosPresupuestos(usuarioId, mes),
    aportesDelRango(usuarioId, mes, mes),
  ]);
  // Los totales de primer nivel son en pesos. Cada moneda también aparece por separado, sin convertir,
  // con sus propios aportes a metas (B-09): igual que en la serie histórica.
  const pesos = lineas.filter((l) => l.moneda === 'ARS');
  const aportesEn = (moneda) => aportes.get(`${mes}|${moneda}`) ?? '0.00';
  const porMoneda = resumenPorMoneda(lineas);
  for (const [clave] of aportes) {
    const moneda = clave.split('|')[1];
    if (!porMoneda.some((m) => m.moneda === moneda)) porMoneda.push({ moneda, ...calcularResumen([], []) });
  }
  return {
    mes,
    ...calcularResumen(pesos, presupuestos),
    aportesMetas: aportesEn('ARS'),
    porMoneda: porMoneda.map((m) => ({ ...m, aportesMetas: aportesEn(m.moneda) })),
  };
}

module.exports = { resumenMensual, lineasDelMes, aportesDelMes, lineasDelRango, aportesDelRango, resumenPorMoneda };
