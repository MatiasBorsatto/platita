import { aCentavos, deCentavos } from './formato.js'

// A partir de los saldos del grupo (los que devuelve la API, sin recalcularlos), arma quién le paga
// a quién para que todos queden al día. En cada paso, el que más debe le paga al que más tiene para
// cobrar: así salen pocos pagos. Exacto en centavos y por moneda: nunca se mezclan pesos con dólares.
//
// Si un gasto compartido todavía no está cubierto del todo, hay deuda sin nadie a quien pagarle
// (los saldos no suman cero). Esa parte se devuelve aparte, en sinCubrir.
export function comoSaldar(saldos) {
  const transferencias = []
  const sinCubrir = []
  const monedas = [...new Set(saldos.map((s) => s.moneda ?? 'ARS'))]
    .sort((a, b) => (a === 'ARS' ? -1 : b === 'ARS' ? 1 : a.localeCompare(b)))

  for (const moneda of monedas) {
    const deudores = []
    const acreedores = []
    for (const s of saldos.filter((x) => (x.moneda ?? 'ARS') === moneda)) {
      const negativo = String(s.saldo).startsWith('-')
      const centavos = aCentavos(negativo ? String(s.saldo).slice(1) : s.saldo) ?? 0n
      if (centavos === 0n) continue
      ;(negativo ? deudores : acreedores).push({ id: s.usuarioId, resto: centavos })
    }
    // El mayor que quede; ante un empate, el primero de la lista.
    const mayor = (lista) => lista.reduce((m, x) => (x.resto > 0n && (!m || x.resto > m.resto) ? x : m), null)

    for (let d = mayor(deudores), a = mayor(acreedores); d && a; d = mayor(deudores), a = mayor(acreedores)) {
      const monto = d.resto < a.resto ? d.resto : a.resto
      transferencias.push({ deudorId: d.id, acreedorId: a.id, monto: deCentavos(monto), moneda })
      d.resto -= monto
      a.resto -= monto
    }
    for (const d of deudores) {
      if (d.resto > 0n) sinCubrir.push({ usuarioId: d.id, monto: deCentavos(d.resto), moneda })
    }
  }
  return { transferencias, sinCubrir }
}
