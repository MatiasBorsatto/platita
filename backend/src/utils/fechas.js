// Argentina no tiene horario de verano: America/Argentina/Buenos_Aires es UTC-3 fijo.
// Por eso se resuelve con un desfase fijo en vez de depender de Intl/ICU.
const OFFSET_BA_MS = 3 * 60 * 60 * 1000;

function partesBA(fecha) {
  const d = new Date(fecha.getTime() - OFFSET_BA_MS);
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

// Medianoche de Buenos Aires del día indicado (instante UTC).
function inicioDiaBA(anio, mes, dia) {
  return new Date(Date.UTC(anio, mes - 1, dia) + OFFSET_BA_MS);
}

function formatoMes(anio, mes) {
  return `${anio}-${String(mes).padStart(2, '0')}`;
}

function sumarMeses(anio, mes, n) {
  const idx = anio * 12 + (mes - 1) + n;
  return { anio: Math.floor(idx / 12), mes: (idx % 12) + 1 };
}

function mesDe(fecha) {
  const { anio, mes } = partesBA(fecha);
  return formatoMes(anio, mes);
}

function diaValido(anio, mes, dia) {
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return Math.min(dia, ultimo);
}

// desde y hasta son medianoches de Buenos Aires (inicio del día) de ambos extremos, inclusive.
function periodoResumen(diaCierre, mes) {
  const [anio, m] = mes.split('-').map(Number);
  const ant = sumarMeses(anio, m, -1);
  const hasta = inicioDiaBA(anio, m, diaValido(anio, m, diaCierre));
  const desde = inicioDiaBA(ant.anio, ant.mes, diaValido(ant.anio, ant.mes, diaCierre) + 1);
  return { desde, hasta };
}

function mesDeCuota(fechaCompra, diaCierre, numeroCuota) {
  const { anio, mes, dia } = partesBA(fechaCompra);
  const primera = dia <= diaValido(anio, mes, diaCierre) ? 0 : 1;
  const r = sumarMeses(anio, mes, primera + numeroCuota - 1);
  return formatoMes(r.anio, r.mes);
}

module.exports = { mesDe, diaValido, periodoResumen, mesDeCuota };
