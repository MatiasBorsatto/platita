const { aCentavos, deCentavos } = require('../../utils/dinero');

// saldo = aportes reales - parte teórica + pagos realizados - pagos recibidos.
// Cada argumento es un objeto { usuarioId: 'monto' }. Devuelve Map<usuarioId, string>.
// La suma no tiene por qué dar cero: si nadie cubrió el faltante de un gasto,
// ese faltante queda pendiente y se muestra aparte.
function calcularSaldos({
  aportadoPorUsuario,
  pagadoPorUsuario = {},
  participacionPorUsuario = {},
  pagosRealizados = {},
  pagosRecibidos = {},
}) {
  // `pagadoPorUsuario` se acepta por compatibilidad con llamadas viejas.
  const aportes = aportadoPorUsuario ?? pagadoPorUsuario;
  const ids = new Set([
    ...Object.keys(aportes),
    ...Object.keys(participacionPorUsuario),
    ...Object.keys(pagosRealizados),
    ...Object.keys(pagosRecibidos),
  ]);
  const c = (obj, id) => (obj[id] === undefined ? 0n : aCentavos(obj[id]));

  const saldos = new Map();
  for (const id of ids) {
    const saldo =
      c(aportes, id) - c(participacionPorUsuario, id) + c(pagosRealizados, id) - c(pagosRecibidos, id);
    saldos.set(id, saldo);
  }

  return new Map([...saldos].map(([id, s]) => [id, s < 0n ? `-${deCentavos(-s)}` : deCentavos(s)]));
}

module.exports = { calcularSaldos };
