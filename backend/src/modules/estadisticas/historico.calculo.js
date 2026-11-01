const { ErrorValidacion } = require('../../utils/errores');

const MAX_MESES = 24;

const indice = (mes) => {
  const [anio, m] = mes.split('-').map(Number);
  return anio * 12 + (m - 1);
};

// Lista los meses 'YYYY-MM' de desde a hasta (ambos incluidos). Ya validados con validarMes.
function mesesEnRango(desde, hasta) {
  const ini = indice(desde);
  const fin = indice(hasta);
  if (fin < ini) throw new ErrorValidacion('"desde" no puede ser posterior a "hasta"');
  if (fin - ini + 1 > MAX_MESES) throw new ErrorValidacion(`El rango no puede superar ${MAX_MESES} meses`);
  const meses = [];
  for (let i = ini; i <= fin; i += 1) {
    meses.push(`${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`);
  }
  return meses;
}

module.exports = { mesesEnRango, MAX_MESES };
