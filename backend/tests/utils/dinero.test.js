const { validarMonto, sumar, dividirEnPartes } = require('../../src/utils/dinero');
const { ErrorValidacion } = require('../../src/utils/errores');

test('dividirEnPartes reparte los centavos sobrantes', () => {
  expect(dividirEnPartes('100.00', 3)).toEqual(['33.34', '33.33', '33.33']);
  expect(sumar(dividirEnPartes('100.00', 3))).toBe('100.00');
});

test('dividirEnPartes con resto de varios centavos', () => {
  expect(dividirEnPartes('0.05', 3)).toEqual(['0.02', '0.02', '0.01']);
});

test('validarMonto rechaza cero, negativos y más de 2 decimales', () => {
  expect(() => validarMonto('0')).toThrow(ErrorValidacion);
  expect(() => validarMonto('-5')).toThrow(ErrorValidacion);
  expect(() => validarMonto('10.005')).toThrow(ErrorValidacion);
  expect(validarMonto('1500.5')).toBe('1500.50');
});

test('validarMonto rechaza valores no numéricos', () => {
  expect(() => validarMonto('abc')).toThrow(ErrorValidacion);
  expect(() => validarMonto(undefined)).toThrow(ErrorValidacion);
  expect(() => validarMonto('')).toThrow(ErrorValidacion);
});

test('validarMonto acepta el máximo de la columna y rechaza un monto que la supera', () => {
  expect(validarMonto('9999999999.99')).toBe('9999999999.99');
  expect(() => validarMonto('10000000000.00')).toThrow(ErrorValidacion);
});

test('validarMonto acepta números sin error de punto flotante', () => {
  expect(validarMonto(10)).toBe('10.00');
  expect(validarMonto('0.01')).toBe('0.01');
});

test('sumar es exacto en centavos', () => {
  expect(sumar(['0.10', '0.20'])).toBe('0.30');
  expect(sumar([])).toBe('0.00');
});

test('ErrorValidacion tiene status 400', () => {
  expect(new ErrorValidacion('x').status).toBe(400);
});
