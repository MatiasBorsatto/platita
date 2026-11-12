const { Op } = require('sequelize');
const { Movimiento, MiembroGrupo, ParticipacionGasto, PagoEntreMiembros, AporteGasto, Usuario } = require('../../db/models');
const { aCentavos, deCentavos } = require('../../utils/dinero');
const { ErrorProhibido } = require('../../utils/errores');
const { rangoDelMes } = require('../movimientos/movimientos.service');
const { calcularSaldos } = require('../saldos/saldos.calculo');
const { calcularResumen } = require('./resumenMensual.calculo');
const { lineasDelRango, aportesDelRango } = require('./estadisticas.service');
const { mesesEnRango } = require('./historico.calculo');

// Solo lectura: reutiliza las reglas del resumen mensual (sin presupuestos, que pueden escribir alertas).
// Dos consultas en total para todo el rango (antes eran dos por mes), agrupadas por mes en memoria.
async function serieHistorica(usuarioId, desde, hasta) {
  const meses = mesesEnRango(desde, hasta);
  const [lineas, aportes] = await Promise.all([
    lineasDelRango(usuarioId, desde, hasta),
    aportesDelRango(usuarioId, desde, hasta),
  ]);
  const porMes = new Map(meses.map((mes) => [mes, []]));
  for (const l of lineas) {
    if (porMes.has(l.mes)) porMes.get(l.mes).push(l);
  }
  // Los totales de primer nivel son en pesos; cada moneda aparece aparte, sin convertir.
  return meses.map((mes) => {
    const delMes = porMes.get(mes);
    const pesos = delMes.filter((l) => l.moneda === 'ARS');
    const { ingresos, gastos, ahorroNeto, gastosPorCategoria } = calcularResumen(pesos, []);
    const monedas = [...new Set(delMes.map((l) => l.moneda))].sort();
    const porMoneda = monedas.map((moneda) => {
      const r = calcularResumen(delMes.filter((l) => l.moneda === moneda), []);
      return { moneda, ingresos: r.ingresos, gastos: r.gastos, ahorroNeto: r.ahorroNeto, aportesMetas: aportes.get(`${mes}|${moneda}`) ?? '0.00' };
    });
    return { mes, ingresos, gastos, ahorroNeto, gastosPorCategoria, aportesMetas: aportes.get(`${mes}|ARS`) ?? '0.00', porMoneda };
  });
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
// Saldo de cada miembro al cierre de cada mes, en una sola moneda (M-07): nunca se mezclan pesos con dólares.
async function saldosHistoricos(usuarioId, grupoId, desde, hasta, moneda = 'ARS') {
  if (!(await MiembroGrupo.findOne({ where: { grupoId, usuarioId } }))) {
    throw new ErrorProhibido('No pertenecés a este grupo');
  }
  const meses = mesesEnRango(desde, hasta);
  const miembros = await MiembroGrupo.findAll({ where: { grupoId }, order: [['createdAt', 'ASC'], ['id', 'ASC']] });
  const movs = await Movimiento.findAll({
    where: { grupoId, alcance: 'compartido', tipo: 'gasto', moneda },
    attributes: ['id', 'monto', 'fecha'],
  });
  const participaciones = movs.length
    ? await ParticipacionGasto.findAll({ where: { movimientoId: movs.map((m) => m.id) } })
    : [];
  const aportes = movs.length
    ? await AporteGasto.findAll({ where: { movimientoId: movs.map((m) => m.id) } })
    : [];
  const fechaDe = new Map(movs.map((m) => [m.id, m.fecha]));
  const pagos = await PagoEntreMiembros.findAll({ where: { grupoId, moneda } });
  const usuarios = await Usuario.findAll({ where: { id: miembros.map((m) => m.usuarioId) }, attributes: ['id', 'nombre'] });
  const nombres = new Map(usuarios.map((u) => [u.id, u.nombre]));

  return meses.map((mes) => {
    const fin = rangoDelMes(mes)[1];
    const hastaFin = (fecha) => fecha <= fin;
    const partesMes = participaciones.filter((p) => hastaFin(fechaDe.get(p.movimientoId)));
    const aportesMes = aportes.filter((a) => hastaFin(a.fecha));
    const pagosMes = pagos.filter((p) => hastaFin(p.fecha));
    const saldos = calcularSaldos({
      aportadoPorUsuario: sumarPor(aportesMes, (a) => a.usuarioId),
      participacionPorUsuario: sumarPor(partesMes, (p) => p.usuarioId),
      pagosRealizados: sumarPor(pagosMes, (p) => p.deudorId),
      pagosRecibidos: sumarPor(pagosMes, (p) => p.acreedorId),
    });
    const ids = [...new Set([...miembros.map((m) => m.usuarioId), ...saldos.keys()])];
    return { mes, moneda, saldos: ids.map((id) => ({ usuarioId: id, nombre: nombres.get(id) ?? null, saldo: saldos.get(id) ?? '0.00' })) };
  });
}

module.exports = { serieHistorica, saldosHistoricos };
