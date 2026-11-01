# Casos de prueba: Platita

Responsable: Matias Borsatto (caja negra y caja blanca). Revisión cruzada: Tomas Agustin Gudiño Rubiolo.

Cada caso sigue la plantilla de la consigna: ID, funcionalidad, objetivo, precondiciones, datos de entrada, procedimiento, resultado esperado, resultado obtenido, estado y observaciones. El resultado obtenido se completa con la ejecución registrada en `02-ejecucion.md`.

## Parte A: Caja negra

Se aplican tres técnicas: clases de equivalencia, análisis de valores límite y datos válidos e inválidos. Los casos se prueban sobre las funciones de dinero (`backend/src/utils/dinero.js`) y el campo de monto del frontend (`frontend/src/components/CampoMonto.vue`).

### A.1 Clases de equivalencia del monto

Clases válidas: enteros positivos, decimales con 1 o 2 cifras, valores grandes dentro del rango de la columna `DECIMAL(12,2)`.
Clases inválidas: cero, negativos, más de 2 decimales, texto, vacío, nulo.

| ID | Funcionalidad | Objetivo | Precondiciones | Datos de entrada | Procedimiento | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|---|---|
| CN-01 | validarMonto | Aceptar un entero válido | Ninguna | `"1500"` | Llamar `validarMonto("1500")` | Devuelve `"1500.00"` | Ver 02 | Ver 02 |
| CN-02 | validarMonto | Aceptar un decimal de una cifra | Ninguna | `"12.5"` | Llamar `validarMonto("12.5")` | Devuelve `"12.50"` | Ver 02 | Ver 02 |
| CN-03 | validarMonto | Aceptar el monto mínimo válido | Ninguna | `"0.01"` | Llamar `validarMonto("0.01")` | Devuelve `"0.01"` | Ver 02 | Ver 02 |
| CN-04 | validarMonto | Rechazar cero | Ninguna | `"0"` | Llamar `validarMonto("0")` | Error de validación 400 "mayor que 0" | Ver 02 | Ver 02 |
| CN-05 | validarMonto | Rechazar cero con decimales | Ninguna | `"0.00"` | Llamar `validarMonto("0.00")` | Error de validación 400 "mayor que 0" | Ver 02 | Ver 02 |
| CN-06 | validarMonto | Rechazar negativos | Ninguna | `"-5"` | Llamar `validarMonto("-5")` | Error de validación 400 | Ver 02 | Ver 02 |
| CN-07 | validarMonto | Rechazar más de 2 decimales | Ninguna | `"1.234"` | Llamar `validarMonto("1.234")` | Error de validación 400 "más de 2 decimales" | Ver 02 | Ver 02 |
| CN-08 | validarMonto | Rechazar texto | Ninguna | `"abc"` | Llamar `validarMonto("abc")` | Error de validación 400 | Ver 02 | Ver 02 |
| CN-09 | validarMonto | Rechazar vacío | Ninguna | `""` | Llamar `validarMonto("")` | Error de validación 400 | Ver 02 | Ver 02 |
| CN-10 | validarMonto | Rechazar nulo | Ninguna | `null` | Llamar `validarMonto(null)` | Error de validación 400 "debe ser un número" | Ver 02 | Ver 02 |
| CN-11 | validarMonto | Aceptar el máximo de la columna | Ninguna | `"9999999999.99"` | Llamar `validarMonto("9999999999.99")` | Devuelve `"9999999999.99"` | Ver 02 | Ver 02 |
| CN-12 | validarMonto | Rechazar un monto que supera la columna | Ninguna | `"10000000000.00"` | Llamar `validarMonto("10000000000.00")` | Error de validación 400 | Ver 02 | **Fallido** (ver D-01) |
| CN-13 | sumar | Sumar sin error de punto flotante | Ninguna | `["0.10", "0.20"]` | Llamar `sumar` | Devuelve `"0.30"` | Ver 02 | Ver 02 |

### A.2 Valores límite del reparto

| ID | Funcionalidad | Objetivo | Datos de entrada | Resultado esperado | Estado |
|---|---|---|---|---|---|
| CN-14 | dividirEnPartes | Reparto con sobrante de centavos | `"100.00"`, 3 partes | `["33.34", "33.33", "33.33"]`; la suma es 100.00 | Ver 02 |
| CN-15 | dividirEnPartes | Cantidad de partes inválida | `"100.00"`, 0 partes | Error de validación 400 | Ver 02 |

### A.3 Campo de monto (frontend)

Los casos se automatizan con Vitest en `frontend/tests/CampoMonto.test.js`.

| ID | Objetivo | Datos de entrada | Resultado esperado | Estado |
|---|---|---|---|---|
| CN-16 | Agrupar miles mientras se escribe | `"30000"` | Muestra `"30.000"`; emite `"30000"` | Aprobado |
| CN-17 | Mantener la coma mientras se escriben decimales | `"1500,5"` | Muestra `"1.500,5"`; emite `"1500.50"` | Aprobado |
| CN-18 | Completar centavos al salir del campo | `"1500"` + blur | Muestra `"1.500,00"`; emite `"1500.00"` | Aprobado |
| CN-19 | Un punto seguido de tres dígitos es separador de miles | `"1.500"` | Muestra `"1.500"` | Aprobado |
| CN-20 | Mostrar con formato un valor que llega de fuera | `"1500.50"` | Muestra `"1.500,50"` | Aprobado |
| CN-21 | Rechazar letras | `"ab"` + blur | Muestra vacío; emite vacío | Aprobado |

### A.4 Saldos del grupo

| ID | Funcionalidad | Datos de entrada | Resultado esperado | Estado |
|---|---|---|---|---|
| CN-22 | calcularSaldos | Pagó 100.00; participación 40.00 y 60.00 | Saldos `"60.00"` y `"-60.00"`; suman cero | Ver 02 |
| CN-23 | calcularSaldos | Pagó 100.00; participación 40.00 | Error interno: los saldos no suman cero | Ver 02 |

## Parte B: Caja blanca

Se analizan tres unidades: `validarMonto` y `aCentavos` (dinero), `calcularSaldos` (saldos) y `mesDeCuota` y `periodoResumen` (fechas).

### B.1 `validarMonto` (backend/src/utils/dinero.js)

- **Instrucciones:** todas las líneas de la función se ejecutan en los casos CN-01 a CN-12.
- **Decisiones:**
  - D1: `typeof valor` no es string ni número. Lo cubre CN-10.
  - D2: la expresión regular no coincide. Lo cubre CN-06 a CN-09.
  - D3: el monto tiene 3 o más decimales. Lo cubre CN-07.
  - D4: `centavos <= 0n`. Lo cubre CN-04 y CN-05.
- **Condiciones:** en D2, cada parte de la expresión regular (signo, dígitos, punto, decimales) tiene un caso que la hace fallar.
- **Caminos:** hay 5 caminos. Ruta de éxito (CN-01 a CN-03, CN-11), tipo inválido (CN-10), formato inválido (CN-06 a CN-09), exceso de decimales (CN-07), cero (CN-04 y CN-05).
- **Cobertura:** todos los caminos están cubiertos por los casos de la tabla. El camino de desborde de la columna no existe en la función. Eso es el defecto D-01.

### B.2 `calcularSaldos` (backend/src/modules/saldos/saldos.calculo.js)

- **Decisiones:** `total !== 0n` lanza `ErrorInterno` (CN-23) o devuelve el mapa de saldos (CN-22).
- **Condiciones:** el signo del saldo decide el formato (`s < 0n`). Hay casos para ambos.
- **Caminos:** suma cero (CN-22) y suma distinta de cero (CN-23).

### B.3 `mesDeCuota` y `periodoResumen` (backend/src/utils/fechas.js)

- **Decisiones:** `dia <= diaValido(...)` decide si la primera cuota cae en el mismo mes o en el siguiente.
- **Casos verificados:**
  - Compra el día de cierre: cuota 1 en el mismo mes (`2026-03`). Verificado.
  - Compra el día siguiente al cierre: cuota 1 en el mes siguiente (`2026-04`). Verificado.
  - Cierre el día 31 en un mes de 28 días: el resumen va del 1 al 28 de febrero. Verificado.

## Trazabilidad con los requisitos

| Requisito (especificación) | Casos |
|---|---|
| Montos con 2 decimales y positivos | CN-01 a CN-11 |
| Aritmética exacta de dinero | CN-13, CN-14, CN-22 |
| Saldos del grupo suman cero | CN-22, CN-23 |
| Fechas de cierre y vencimiento en hora de Buenos Aires | cuotas y periodo de resumen (parte B.3) |
| Campo de monto formateado | CN-16 a CN-21 |
