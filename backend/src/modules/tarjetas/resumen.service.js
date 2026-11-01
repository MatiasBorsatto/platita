const { Op } = require('sequelize');
const { Movimiento, Compra } = require('../../db/models');
const { sumar, dividirEnPartes } = require('../../utils/dinero');
const { periodoResumen, mesDeCuota, diaValido } = require('../../utils/fechas');
const { obtenerPropia } = require('./tarjetas.service');

// periodoResumen devuelve medianoches de Buenos Aires (03:00 UTC): su fecha UTC es la del día
// de Buenos Aires. Movimiento.fecha es DATEONLY, así que el rango se arma con textos YYYY-MM-DD.
const aDia = (instante) => instante.toISOString().slice(0, 10);

// fecha es YYYY-MM-DD (calendario); se interpreta al mediodía de Buenos Aires (UTC-3).
const aInstante = (fecha) => new Date(`${fecha}T12:00:00-03:00`);

// Vencimiento: día diaVencimiento del mes siguiente al cierre del resumen.
function vencimientoDe(mes, diaVencimiento) {
  const [anio, m] = mes.split('-').map(Number);
  const sig = m === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: m + 1 };
  const dia = diaValido(sig.anio, sig.mes, diaVencimiento);
  return `${sig.anio}-${String(sig.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

async function cuotasFuturasDe(usuarioId, tarjeta, mes) {
  const compras = await Compra.findAll({
    where: { usuarioId, tarjetaId: tarjeta.id, modalidad: 'compra_completa' },
  });
  const porMes = new Map();
  for (const c of compras) {
    dividirEnPartes(c.montoTotal, c.cuotas).forEach((monto, i) => {
      const mesCuota = mesDeCuota(aInstante(c.fecha), tarjeta.diaCierre, i + 1);
      if (mesCuota > mes) porMes.set(mesCuota, [...(porMes.get(mesCuota) || []), monto]);
    });
  }
  return [...porMes.keys()].sort().map((m) => ({ mes: m, monto: sumar(porMes.get(m)) }));
}

async function resumenTarjeta(usuarioId, tarjetaId, mes) {
  const tarjeta = await obtenerPropia(usuarioId, tarjetaId);
  const { desde, hasta } = periodoResumen(tarjeta.diaCierre, mes);
  const rango = [aDia(desde), aDia(hasta)];
  const movimientos = await Movimiento.findAll({
    where: { usuarioId, tarjetaId, tipo: 'gasto', fecha: { [Op.between]: rango } },
    order: [['fecha', 'ASC'], ['createdAt', 'ASC'], ['id', 'ASC']],
  });
  return {
    desde: rango[0],
    hasta: rango[1],
    vencimiento: vencimientoDe(mes, tarjeta.diaVencimiento),
    total: sumar(movimientos.map((m) => m.monto)),
    movimientos,
    cuotasFuturas: await cuotasFuturasDe(usuarioId, tarjeta, mes),
  };
}

// El pago del resumen no tiene categoría ni cuenta como gasto o ingreso.
async function registrarPagoResumen(usuarioId, tarjetaId, { monto, fecha }) {
  await obtenerPropia(usuarioId, tarjetaId);
  return Movimiento.create({
    usuarioId,
    tarjetaId,
    tipo: 'pago_tarjeta',
    alcance: 'personal',
    monto,
    fecha,
    categoriaId: null,
    descripcion: 'Pago de resumen',
  });
}

module.exports = { resumenTarjeta, registrarPagoResumen };
