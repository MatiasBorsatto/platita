const { ErrorValidacion } = require('./errores');

// Todo el cálculo se hace en centavos enteros (BigInt); nunca con floats.

// Máximo que admite la columna DECIMAL(12,2) de los montos: 9999999999.99.
const MAXIMO_CENTAVOS = 999999999999n;

function aCentavos(monto) {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(monto).trim());
  if (!m) throw new ErrorValidacion('Monto inválido');
  return BigInt(m[1]) * 100n + BigInt((m[2] || '').padEnd(2, '0') || '0');
}

function deCentavos(centavos) {
  const s = centavos.toString().padStart(3, '0');
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
}

function validarMonto(valor) {
  if (typeof valor !== 'string' && typeof valor !== 'number') {
    throw new ErrorValidacion('El monto debe ser un número');
  }
  const texto = String(valor).trim();
  if (!/^\d+(\.\d+)?$/.test(texto)) {
    throw new ErrorValidacion('El monto debe ser un número positivo');
  }
  if (/\.\d{3,}$/.test(texto)) {
    throw new ErrorValidacion('El monto no puede tener más de 2 decimales');
  }
  const centavos = aCentavos(texto);
  if (centavos <= 0n) throw new ErrorValidacion('El monto debe ser mayor que 0');
  if (centavos > MAXIMO_CENTAVOS) throw new ErrorValidacion('El monto supera el máximo permitido (9999999999.99)');
  return deCentavos(centavos);
}

function sumar(montos) {
  return deCentavos(montos.reduce((acc, m) => acc + aCentavos(m), 0n));
}

// Como sumar, pero admite montos negativos (los retiros de una meta se guardan como aportes negativos).
// Devuelve "-12.34" si el total es negativo.
function sumarConSigno(montos) {
  const total = montos.reduce((acc, m) => {
    const texto = String(m).trim();
    return texto.startsWith('-') ? acc - aCentavos(texto.slice(1)) : acc + aCentavos(texto);
  }, 0n);
  return total < 0n ? `-${deCentavos(-total)}` : deCentavos(total);
}

function dividirEnPartes(total, cantidad) {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw new ErrorValidacion('La cantidad de partes debe ser un entero mayor o igual a 1');
  }
  const centavos = aCentavos(total);
  const n = BigInt(cantidad);
  const base = centavos / n;
  const sobrante = Number(centavos % n);
  return Array.from({ length: cantidad }, (_, i) => deCentavos(base + (i < sobrante ? 1n : 0n)));
}

// Formato argentino para textos que ve el usuario (avisos): "$ 450.000,00" o "US$ 1.250,00".
// Trabaja en centavos, igual que el resto del módulo: nunca con floats.
function formatearMonto(monto, moneda = 'ARS') {
  const centavos = aCentavos(monto);
  const entero = (centavos / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimales = (centavos % 100n).toString().padStart(2, '0');
  const simbolo = moneda === 'ARS' ? '$' : moneda === 'USD' ? 'US$' : moneda;
  return `${simbolo} ${entero},${decimales}`;
}

module.exports = { validarMonto, sumar, sumarConSigno, dividirEnPartes, aCentavos, deCentavos, formatearMonto };
