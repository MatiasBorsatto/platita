const { aCentavos, deCentavos } = require('../../utils/dinero');
const { ErrorInterno } = require('../../utils/errores');

// saldo = pagado - participación + pagosRealizados - pagosRecibidos (centavos enteros).
// Cada argumento es un objeto { usuarioId: 'monto' }. Devuelve Map<usuarioId, string>.
function calcularSaldos({
  pagadoPorUsuario = {},
  participacionPorUsuario = {},
  pagosRealizados = {},
  pagosRecibidos = {},
}) {
  const ids = new Set([
    ...Object.keys(pagadoPorUsuario),
    ...Object.keys(participacionPorUsuario),
    ...Object.keys(pagosRealizados),
    ...Object.keys(pagosRecibidos),
  ]);
  const c = (obj, id) => (obj[id] === undefined ? 0n : aCentavos(obj[id]));

  const saldos = new Map();
  let total = 0n;
  for (const id of ids) {
    const saldo =
      c(pagadoPorUsuario, id) - c(participacionPorUsuario, id) + c(pagosRealizados, id) - c(pagosRecibidos, id);
    saldos.set(id, saldo);
    total += saldo;
  }
  if (total !== 0n) throw new ErrorInterno('Los saldos del grupo no suman cero');

  return new Map([...saldos].map(([id, s]) => [id, s < 0n ? `-${deCentavos(-s)}` : deCentavos(s)]));
}

module.exports = { calcularSaldos };
