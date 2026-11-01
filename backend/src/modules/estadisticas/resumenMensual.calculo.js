const { aCentavos, deCentavos } = require('../../utils/dinero');

const SIN_CATEGORIA = 'Sin categoría';

// Puro y exacto (centavos BigInt). Cada línea: { tipo, monto, categoriaId, nombre }.
// Las líneas ya vienen resueltas para el usuario: gastos personales y su parte en gastos compartidos
// (tipo 'gasto'). Los 'pago_tarjeta' se ignoran porque sus compras ya cuentan como gasto.
function calcularResumen(movimientos, presupuestos) {
  let ingresos = 0n;
  let gastos = 0n;
  const porCategoria = new Map();
  for (const m of movimientos) {
    if (m.tipo === 'ingreso') {
      ingresos += aCentavos(m.monto);
    } else if (m.tipo === 'gasto') {
      const monto = aCentavos(m.monto);
      gastos += monto;
      const clave = m.categoriaId ?? null;
      const previo = porCategoria.get(clave);
      porCategoria.set(clave, {
        categoriaId: clave,
        nombre: clave === null ? SIN_CATEGORIA : m.nombre,
        centavos: (previo ? previo.centavos : 0n) + monto,
      });
    }
  }
  const gastosPorCategoria = [...porCategoria.values()]
    .sort((a, b) => (a.centavos === b.centavos ? 0 : a.centavos > b.centavos ? -1 : 1))
    .map(({ categoriaId, nombre, centavos }) => ({ categoriaId, nombre, monto: deCentavos(centavos) }));
  const neto = ingresos - gastos;
  return {
    ingresos: deCentavos(ingresos),
    gastos: deCentavos(gastos),
    ahorroNeto: neto < 0n ? `-${deCentavos(-neto)}` : deCentavos(neto),
    gastosPorCategoria,
    presupuestos,
  };
}

module.exports = { calcularResumen };
