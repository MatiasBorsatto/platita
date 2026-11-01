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
    attributes: ['tipo', 'monto', 'categoriaId'],
  });
  const partes = await ParticipacionGasto.findAll({
    where: { usuarioId },
    attributes: ['monto', 'categoriaId'],
    include: [{
      model: Movimiento,
      required: true,
      attributes: [],
      where: { tipo: 'gasto', alcance: 'compartido', fecha },
    }],
  });
  const lineas = [
    ...personales.map((m) => ({ tipo: m.tipo, monto: m.monto, categoriaId: m.categoriaId })),
    ...partes.map((p) => ({ tipo: 'gasto', monto: p.monto, categoriaId: p.categoriaId })),
  ];
  const catIds = [...new Set(lineas.map((l) => l.categoriaId).filter(Boolean))];
  const categorias = catIds.length ? await Categoria.findAll({ where: { id: catIds }, attributes: ['id', 'nombre'] }) : [];
  const nombres = new Map(categorias.map((c) => [c.id, c.nombre]));
  return lineas.map((l) => ({ ...l, nombre: nombres.get(l.categoriaId) ?? null }));
}

// Informativo: aportes (netos de retiros) del mes a las metas propias del usuario.
async function aportesDelMes(usuarioId, mes) {
  const metas = await Meta.findAll({ where: { usuarioId }, attributes: ['id'] });
  if (metas.length === 0) return '0.00';
  const aportes = await AporteMeta.findAll({
    where: { metaId: metas.map((m) => m.id), fecha: { [Op.between]: rangoDelMes(mes) } },
    attributes: ['monto'],
  });
  return sumar(aportes.map((a) => a.monto));
}

async function resumenMensual(usuarioId, mes) {
  const [lineas, presupuestos, aportesMetas] = await Promise.all([
    lineasDelMes(usuarioId, mes),
    calcularEstadosPresupuestos(usuarioId, mes),
    aportesDelMes(usuarioId, mes),
  ]);
  return { mes, ...calcularResumen(lineas, presupuestos), aportesMetas };
}

module.exports = { resumenMensual, lineasDelMes, aportesDelMes };
