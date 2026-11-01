# TDD, refactorización y pruebas de regresión

Responsable: Matias Borsatto.

## 1. TDD: ciclo Prueba → implementación → ejecución → corrección

Ciclo documentado sobre la funcionalidad de **validación de montos**, la base de todo el módulo de dinero.

Honestidad sobre el proceso: durante el desarrollo se trabajó con tests escritos antes o junto con la implementación, y los reportes por tarea están en `.superpowers/` (ignorado por Git). En la corrección D-01 la prueba se agregó **después** de la implementación, así que ese caso no sigue el orden RED → GREEN. Se documenta igual para no atribuirse un orden que no ocurrió.

| Paso | Qué se hizo | Evidencia |
|---|---|---|
| Prueba | `validarMonto` aceptaba `10000000000.00`, que supera `DECIMAL(12,2)`. Se verificó con una prueba de API que respondía 500. | `02-ejecucion.md`, sección 2 |
| Implementación | Se agregó la constante `MAXIMO_CENTAVOS = 999999999999n` y la validación `centavos > MAXIMO_CENTAVOS`. | `backend/src/utils/dinero.js` |
| Ejecución | Pruebas unitarias del módulo de dinero y prueba de integración de la API. | `backend/tests/utils/dinero.test.js`, `backend/tests/monto-maximo.test.js` |
| Corrección | Suite completa de backend: 211 pruebas aprobadas. | `05-automatizacion.md` |

Las pruebas de aislamiento entre usuarios y del flujo completo de grupo están en los commits `3fa0eb8` y `1f48f65`. Los reportes no permiten confirmar si se escribieron antes que la implementación, así que no se cuentan como ejemplo de TDD completo.

## 2. Refactorización

**Problema del código original.** `calcularEstadosPresupuestos` y `estadoPresupuestos` hacían dos cosas a la vez: calculaban el estado de los presupuestos y **registraban alertas en la base**. El resumen mensual de estadísticas usaba esa función, así que solo mirar las estadísticas generaba notificaciones. Eso es un efecto secundario inesperado en una consulta de lectura (defecto D-06).

**Modificación.** Se separó el cálculo en una función de solo lectura (`calcularEstadosPresupuestos`), que no escribe nada, y una función que sí registra alertas (`estadoPresupuestos`), que se usa únicamente en el flujo de presupuestos.

**Por qué mejora el código.** Una consulta de lectura ya no tiene efectos secundarios. Las estadísticas se pueden repetir sin cambiar el estado de la base, y cada función tiene una sola responsabilidad.

**Pruebas que confirman que la funcionalidad sigue igual.**
- Prueba específica: al consultar el resumen mensual no se crea ninguna notificación.
- Suite de presupuestos y estadísticas, incluida en las 211 pruebas de backend.

## 3. Pruebas de regresión

Regla aplicada: después de cada corrección se ejecuta la suite completa, y no solo la prueba nueva.

| Cambio | Pruebas antes del cambio | Modificación | Pruebas de regresión | Resultado |
|---|---|---|---|---|
| D-01: tope de monto | 208 pruebas de backend aprobadas | Tope en `validarMonto` | Suite completa de backend | 211 aprobadas (208 previas + 3 nuevas) |
| D-16: doble envío (interfaz) | 74 pruebas de frontend aprobadas | Bloqueo de envíos y barra de progreso | Suite completa de frontend | 80 aprobadas (74 previas + 6 del campo de monto) |
| Iconos de fondo y alertas | 80 pruebas de frontend | Cambios de layout y de alertas | Suite completa de frontend | 80 aprobadas |

Las pruebas de regresión que más protegen el sistema son las de aislamiento entre usuarios (`3fa0eb8`, `1f48f65`), porque un cambio en una consulta compartida podría mostrar datos de otra cuenta.
