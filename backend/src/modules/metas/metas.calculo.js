const { aCentavos, deCentavos } = require('../../utils/dinero');

// Montos con signo como centavos enteros (BigInt). aCentavos solo acepta no negativos.
function aCentavosFirmado(monto) {
  const texto = String(monto).trim();
  return texto.startsWith('-') ? -aCentavos(texto.slice(1)) : aCentavos(texto);
}

function deCentavosFirmado(centavos) {
  return centavos < 0n ? `-${deCentavos(-centavos)}` : deCentavos(centavos);
}

// Puro y exacto. porcentaje puede superar 100 (meta excedida) o ser negativo (más retiros que aportes).
function progresoMeta({ montoObjetivo, acumulado }) {
  const objetivo = aCentavos(montoObjetivo);
  const juntado = aCentavosFirmado(acumulado);
  const porcentaje = objetivo === 0n ? 0 : Number((juntado * 10000n) / objetivo) / 100;
  return { porcentaje, restante: deCentavosFirmado(objetivo - juntado) };
}

module.exports = { progresoMeta };
