const { aCentavos, deCentavos } = require('../../utils/dinero');

// Puro y exacto: todo en centavos enteros (BigInt). consumido y montoLimite son strings de 2 decimales.
// alerta '80' desde el 80% inclusive; '100' solo al superar el límite.
function calcularEstado({ montoLimite, consumido }) {
  const limite = aCentavos(montoLimite);
  const gastado = aCentavos(consumido);
  const dif = limite - gastado;
  const restante = dif < 0n ? `-${deCentavos(-dif)}` : deCentavos(dif);
  const porcentaje = limite === 0n ? 0 : Number((gastado * 10000n) / limite) / 100;
  let alerta = null;
  if (gastado > limite) alerta = '100';
  else if (gastado * 100n >= limite * 80n) alerta = '80';
  return { restante, porcentaje, alerta };
}

module.exports = { calcularEstado };
