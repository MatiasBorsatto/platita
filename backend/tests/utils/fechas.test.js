const { mesDe, diaValido, periodoResumen, mesDeCuota } = require('../../src/utils/fechas');
const { ErrorNoEncontrado } = require('../../src/utils/errores');

test('mesDeCuota: compra el 31 con cierre el 15 cae en el resumen siguiente', () => {
  expect(mesDeCuota(new Date('2026-01-31'), 15, 1)).toBe('2026-02');
});

test('mesDeCuota: compra antes o en el cierre cae en el mismo mes', () => {
  expect(mesDeCuota(new Date('2026-01-10T12:00:00-03:00'), 15, 1)).toBe('2026-01');
  expect(mesDeCuota(new Date('2026-01-15T12:00:00-03:00'), 15, 1)).toBe('2026-01');
});

test('mesDeCuota: cuotas siguientes en meses consecutivos y cruce de año', () => {
  expect(mesDeCuota(new Date('2026-11-20T12:00:00-03:00'), 15, 1)).toBe('2026-12');
  expect(mesDeCuota(new Date('2026-11-20T12:00:00-03:00'), 15, 3)).toBe('2027-02');
});

test('mesDe usa zona Buenos Aires', () => {
  // 01:00 UTC del 1 de febrero sigue siendo 31 de enero en Buenos Aires
  expect(mesDe(new Date('2026-02-01T01:00:00Z'))).toBe('2026-01');
  expect(mesDe(new Date('2026-02-01T03:00:00Z'))).toBe('2026-02');
});

test('diaValido ajusta el 31 a febrero', () => {
  expect(diaValido(2026, 2, 31)).toBe(28);
  expect(diaValido(2028, 2, 31)).toBe(29);
  expect(diaValido(2026, 4, 31)).toBe(30);
  expect(diaValido(2026, 3, 31)).toBe(31);
});

test('periodoResumen: desde es el día posterior al cierre anterior', () => {
  const { desde, hasta } = periodoResumen(15, '2026-03');
  expect(mesDe(desde)).toBe('2026-02');
  expect(desde.toISOString()).toBe('2026-02-16T03:00:00.000Z');
  expect(hasta.toISOString()).toBe('2026-03-15T03:00:00.000Z');
});

test('periodoResumen ajusta cierre 31 en meses cortos', () => {
  const { desde, hasta } = periodoResumen(31, '2026-03');
  expect(desde.toISOString()).toBe('2026-03-01T03:00:00.000Z'); // cierre feb = 28
  expect(hasta.toISOString()).toBe('2026-03-31T03:00:00.000Z');
});

test('ErrorNoEncontrado tiene status 404', () => {
  expect(new ErrorNoEncontrado('x').status).toBe(404);
});
