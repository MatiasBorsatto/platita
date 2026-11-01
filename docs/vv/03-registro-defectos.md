# Registro de defectos

Plantilla: ID, fecha, descripción, funcionalidad afectada, pasos para reproducir, resultado esperado, resultado obtenido, evidencia, severidad, prioridad y estado.

Severidad: crítica (pérdida o corrupción de datos), alta (funcionalidad principal rota), media (error no controlado sin pérdida de datos), baja (cosmético o de usabilidad).

## D-01: la API responde 500 cuando el monto supera la columna

| Campo | Valor |
|---|---|
| ID | D-01 |
| Fecha | 30/10/2026 |
| Descripción | `POST /api/movimientos` acepta un monto de 11 dígitos enteros. La validación `validarMonto` no tiene tope, la columna `monto` es `DECIMAL(12,2)` y solo admite 10 dígitos enteros. La base rechaza el insert y la API responde 500. |
| Funcionalidad afectada | Alta de movimientos (y cualquier campo de monto que use `validarMonto`: metas, presupuestos, tarjetas, pagos). |
| Pasos para reproducir | 1. Iniciar sesión. 2. Enviar `POST /api/movimientos` con `{"tipo":"gasto","monto":"10000000000.00","fecha":"2026-10-30","descripcion":"desborde"}`. |
| Resultado esperado | 400 con mensaje de validación, por ejemplo "El monto supera el máximo permitido". |
| Resultado obtenido | 500 `{"error":"Error interno del servidor"}`. |
| Evidencia | Prueba de integración temporal, salida: `STATUS 500`. Caso CN-12 de `01-casos-de-prueba.md`. |
| Severidad | Media. No hay pérdida de datos, pero el error no es controlado. |
| Prioridad | Media. La interfaz impide ingresar ese valor, así que el usuario no lo ve normalmente. |
| Estado | Cerrado. `validarMonto` rechaza montos mayores que 9999999999.99 con error 400. Cubierto por `tests/utils/dinero.test.js` y `tests/monto-maximo.test.js`. |

## Defectos detectados y corregidos durante el desarrollo

Fechas aproximadas: las anotaciones de desarrollo no registran la fecha exacta de cada corrección; se indica el período en que se detectó (octubre de 2026).

| ID | Funcionalidad afectada | Descripción | Severidad | Corrección | Estado |
|---|---|---|---|---|---|
| D-02 | Conexión a la base | La conexión TLS usaba `rejectUnauthorized: false`, sin verificar el certificado. | Crítica | Se centralizó la configuración en `db/ssl.js` con verificación activa. | Cerrado |
| D-03 | Recuperación de contraseña | Un correo inexistente devolvía respuesta distinta, lo que permitía enumerar cuentas. | Alta | Respuesta constante 200 y envío del correo sin espera. | Cerrado |
| D-04 | Recuperación de contraseña | `/estado` quedaba bloqueado mientras se enviaba el correo. | Media | Envío sin `await` y timeouts SMTP de 10 s. | Cerrado |
| D-05 | Presupuestos y saldos | El cálculo de restante y porcentaje se hacía en el cliente, con riesgo de discrepancia. | Media | El cliente muestra los valores que entrega la API. | Cerrado |
| D-06 | Estadísticas | La consulta de estadísticas escribía alertas en la base. | Alta | Se separó `calcularEstadosPresupuestos` (solo lectura) y se agregó un test que verifica cero notificaciones. | Cerrado |
| D-07 | Movimientos | Un gasto compartido aparecía en la lista personal y se podía editar por la ruta personal. | Alta | Filtro `alcance = 'personal'` en listar y obtener. | Cerrado |
| D-08 | Gastos compartidos | El selector de categoría por participante quedaba vacío por defecto. | Baja | Valor inicial `''`. | Cerrado |
| D-09 | Interfaz móvil | La barra inferior se desbordaba a 375 px. | Media | Grilla 4x2 y objetivos táctiles de 44 px. Verificado en 11 rutas. | Cerrado |
| D-10 | Movimientos y categorías | Un ID que no era UUID devolvía 500. | Media | `validarIdParam` responde 404. | Cerrado |
| D-11 | Formularios | La fecha por defecto se calculaba en UTC y proponía el día siguiente después de las 21:00 en Argentina. | Media | `hoyLocal()` en los formularios. | Cerrado |
| D-12 | Metas | Al editar un movimiento, el aporte asociado a la meta quedaba desactualizado. | Alta | Actualización dentro de la misma transacción. | Cerrado |
| D-13 | Tarjetas | La descripción de una compra en cuotas podía superar 255 caracteres con el sufijo "(n/N)". | Media | Límite de 200 caracteres en la descripción base. | Cerrado |
| D-14 | Sesión | El refresh token nunca se usaba y la sesión caía a los 15 minutos. | Alta | Reintento automático tras `POST /api/auth/refresh`. | Cerrado |
| D-15 | Recuperación de contraseña | El enlace del correo no tenía ruta en el frontend. | Alta | Ruta `/restablecer` y su vista. | Cerrado |
| D-16 | Movimientos (interfaz) | Al presionar "Guardar" dos veces se creaban dos movimientos iguales. | Alta | Bloqueo de envíos mientras hay peticiones en curso. Verificado: un doble clic crea un solo movimiento. | Cerrado |

## Minors diferidos

Quedan documentados, sin corregir, por no afectar la funcionalidad principal:

- Índice único en `googleId`.
- Revocación de refresh tokens.
- Rate limit en `/recuperar` y `/unirse`.
- Atomicidad del chequeo de último administrador de un grupo.
- Upsert de presupuesto no atómico.
- N+1 en `estadoPresupuestos`.
- "Cargar más" en gastos compartidos (la interfaz muestra 100).
- El límite de descripción en gastos compartidos es 200 en la interfaz y 255 en la API.
- El participante no puede cambiar su propia categoría (no hay endpoint).
- El token de recuperación e invitación viaja en la URL.
- Igualdad estricta de UUID (sin normalizar mayúsculas).
