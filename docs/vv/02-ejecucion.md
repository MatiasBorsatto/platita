# Ejecución de pruebas

Fecha de ejecución: 30/10/2026. Entorno: Windows 10, Node 25, base PostgreSQL en Neon. Responsable de la ejecución: Matias Borsatto.

## 1. Casos de caja negra y blanca sobre las funciones reales

Se ejecutaron llamando a las funciones del backend con cada entrada. Salida real:

| ID | Entrada | Resultado obtenido | Estado |
|---|---|---|---|
| CN-01 | `validarMonto("1500")` | `"1500.00"` | Aprobado |
| CN-02 | `validarMonto("12.5")` | `"12.50"` | Aprobado |
| CN-03 | `validarMonto("0.01")` | `"0.01"` | Aprobado |
| CN-04 | `validarMonto("0")` | Error: "El monto debe ser mayor que 0" | Aprobado |
| CN-05 | `validarMonto("0.00")` | Error: "El monto debe ser mayor que 0" | Aprobado |
| CN-06 | `validarMonto("-5")` | Error: "El monto debe ser un número positivo" | Aprobado |
| CN-07 | `validarMonto("1.234")` | Error: "no puede tener más de 2 decimales" | Aprobado |
| CN-08 | `validarMonto("abc")` | Error: "El monto debe ser un número positivo" | Aprobado |
| CN-09 | `validarMonto("")` | Error: "El monto debe ser un número positivo" | Aprobado |
| CN-10 | `validarMonto(null)` | Error: "El monto debe ser un número" | Aprobado |
| CN-11 | `validarMonto("9999999999.99")` | `"9999999999.99"` | Aprobado |
| CN-12 | `validarMonto("10000000000.00")` | Acepta el valor y devuelve `"10000000000.00"` | **Fallido** (D-01) |
| CN-13 | `sumar(["0.10", "0.20"])` | `"0.30"` | Aprobado |
| CN-14 | `dividirEnPartes("100.00", 3)` | `["33.34", "33.33", "33.33"]` | Aprobado |
| CN-15 | `dividirEnPartes("100.00", 0)` | Error: "debe ser un entero mayor o igual a 1" | Aprobado |
| CN-22 | `calcularSaldos` con pagado 100.00 y participación 40.00 y 60.00 | `{ a: "60.00", b: "-60.00" }` | Aprobado |
| CN-23 | `calcularSaldos` con pagado 100.00 y participación 40.00 | Error interno: "no suman cero" | Aprobado |

Las fechas se verificaron con las funciones de `fechas.js`:

| Caso | Resultado obtenido | Estado |
|---|---|---|
| Compra el día de cierre (15/03, cierre 15) | Primera cuota en `2026-03` | Aprobado |
| Compra el día 16 (cierre 15) | Primera cuota en `2026-04` | Aprobado |
| Cierre el día 31 en febrero | Resumen del 2026-02-01 al 2026-02-28 | Aprobado |

## 2. Caso de la API con monto que supera la columna

Prueba de integración temporal con Jest y Supertest: se registró un usuario, se inició sesión y se envió `POST /api/movimientos` con `monto: "10000000000.00"`.

- Resultado esperado: 400 (validación).
- Resultado obtenido: 500 `{"error":"Error interno del servidor"}`.
- Estado: **Fallido**, registrado como D-01. La prueba se eliminó después de ejecutarla.

## 3. Suites automatizadas del repositorio

| Suite | Herramienta | Resultado |
|---|---|---|
| Backend | Jest + Supertest, con base real | 26 archivos, 208 pruebas: 208 aprobadas |
| Frontend | Vitest + Vue Test Utils | 22 archivos, 80 pruebas: 80 aprobadas |

Estas suites se ejecutaron después del último cambio de código. Cubren unitarias (dinero, fechas, saldos, presupuestos), integración (flujos de grupo, aislamiento entre usuarios, perfil) y componentes del frontend.

## 4. Resumen

- 17 casos ejecutados a mano sobre las funciones: 16 aprobados y 1 fallido (CN-12).
- 6 casos de campo de monto (CN-16 a CN-21) automatizados en Vitest: 6 aprobados.
- 1 caso de API ejecutado: fallido (D-01).
- Suites automatizadas al ejecutar: 288 pruebas aprobadas de 288. Después de corregir D-01 quedan 291: 211 de backend y 80 de frontend, todas aprobadas.
