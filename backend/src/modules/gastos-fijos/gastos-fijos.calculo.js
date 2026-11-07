const { dividirEnPartes } = require('../../utils/dinero');
const { diaValido, sumarMeses, formatoMes, sumarDias } = require('../../utils/fechas');

function fechaVencimiento(mes, dia) {
  const [anio, m] = mes.split('-').map(Number);
  return `${mes}-${String(diaValido(anio, m, dia)).padStart(2, '0')}`;
}

function mesCuota(mesInicio, numero) {
  const [anio, mes] = mesInicio.split('-').map(Number);
  const r = sumarMeses(anio, mes, numero - 1);
  return formatoMes(r.anio, r.mes);
}

// Cuotas de un concepto finito. Los centavos que no dividen exacto se reparten
// desde la primera cuota, igual que en los gastos compartidos.
function cuotasFinanciadas({ montoTotal, cuotas, mesInicio, diaVencimiento: dia }) {
  const montos = dividirEnPartes(montoTotal, cuotas);
  return montos.map((monto, i) => {
    const mes = mesCuota(mesInicio, i + 1);
    return { numero: i + 1, mes, monto, fechaVencimiento: fechaVencimiento(mes, dia) };
  });
}

// Monto que se muestra por mes para un concepto: el de la cuota si es finito,
// o el monto mensual si es recurrente.
function montoMensualConcepto(concepto) {
  if (concepto.cuotas === null || concepto.cuotas === undefined) return concepto.montoTotal;
  return dividirEnPartes(concepto.montoTotal, concepto.cuotas)[0];
}

// 'pagado' | 'vencido' | 'proximo' (vence dentro de 7 días) | 'pendiente'.
function situacionCuota({ estado, fechaVencimiento: vence }, hoy) {
  if (estado === 'pagado') return 'pagado';
  if (vence < hoy) return 'vencido';
  if (vence <= sumarDias(hoy, 7)) return 'proximo';
  return 'pendiente';
}

module.exports = { fechaVencimiento, mesCuota, cuotasFinanciadas, montoMensualConcepto, situacionCuota };
