const { Op } = require('sequelize');
const { Movimiento, MiembroGrupo, ParticipacionGasto, PagoEntreMiembros } = require('../../db/models');
const { aCentavos, deCentavos } = require('../../utils/dinero');
const { ErrorProhibido } = require('../../utils/errores');
const { rangoDelMes } = require('../movimientos/movimientos.service');
const { calcularSaldos } = require('../saldos/saldos.calculo');
const { calcularResumen } = require('./resumenMensual.calculo');
const { lineasDelMes, aportesDelMes } = require('./estadisticas.service');
const { mesesEnRango } = require('./historico.calculo');

// Solo lectura: reutiliza las reglas del resumen mensual (sin presupuestos, que pueden escribir alertas).
async function serieHistorica(usuarioId, desde, hasta) {
  const meses = mesesEnRango(desde, hasta);
  const serie = [];
  for (const mes of meses) {
    const [lineas, aportesMetas] = await Promise.all([lineasDelMes(usuarioId, mes), aportesDelMes(usuarioId, mes)]);
    const { ingresos, gastos, ahorroNeto, gastosPorCategoria } = calcularResumen(lineas, []);
    serie.push({ mes, ingresos, gastos, ahorroNeto, gastosPorCategoria, aportesMetas });
  }
  return serie;
}

function sumarPor(filas, claveDe) {
  const acc = {};
  for (const f of filas) {
    const k = claveDe(f);
    acc[k] = (acc[k] ?? 0n) + aCentavos(f.monto);
  }
  return Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, deCentavos(v)]));
}

// Saldo acumulado de cada miembro al cierre de cada mes del rango.
async function saldosHistoricos(usuarioId, grupoId, desde, hasta) {
  if (!(await MiembroGrupo.findOne({ where: { grupoId, usuarioId } }))) {
    throw new ErrorProhibido('No pertenecés a este grupo');
  }
  const meses = mesesEnRango(desde, hasta);
  const miembros = await MiembroGrupo.findAll({ where: { grupoId }, order: [['createdAt', 'ASC'], ['id', 'ASC']] });
  const movs = await Movimiento.findAll({
    where: { grupoId, alcance: 'compartido', tipo: 'gasto' },
    attributes: ['id', 'pagadorId', 'monto', 'fecha'],
  });
  const participaciones = movs.length
    ? await ParticipacionGasto.findAll({ where: { movimientoId: movs.map((m) => m.id) } })
    : [];
  const fechaDe = new Map(movs.map((m) => [m.id, m.fecha]));
  const pagos = await PagoEntreMiembros.findAll({ where: { grupoId } });

  return meses.map((mes) => {
    const fin = rangoDelMes(mes)[1];
    const hastaFin = (fecha) => fecha <= fin;
    const movsMes = movs.filter((m) => hastaFin(m.fecha));
    const partesMes = participaciones.filter((p) => hastaFin(fechaDe.get(p.movimientoId)));
    const pagosMes = pagos.filter((p) => hastaFin(p.fecha));
    const saldos = calcularSaldos({
      pagadoPorUsuario: sumarPor(movsMes.filter((m) => m.pagadorId), (m) => m.pagadorId),
      participacionPorUsuario: sumarPor(partesMes, (p) => p.usuarioId),
      pagosRealizados: sumarPor(pagosMes, (p) => p.deudorId),
      pagosRecibidos: sumarPor(pagosMes, (p) => p.acreedorId),
    });
    const ids = [...new Set([...miembros.map((m) => m.usuarioId), ...saldos.keys()])];
    return { mes, saldos: ids.map((id) => ({ usuarioId: id, saldo: saldos.get(id) ?? '0.00' })) };
  });
}

module.exports = { serieHistorica, saldosHistoricos };
