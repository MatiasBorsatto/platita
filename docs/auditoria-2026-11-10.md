# Auditoría completa: código frente a la documentación

Fecha: 10/11/2026. Rama: `feature/finanzas-jaki` (commit `7e496a7`). Este documento no modifica el código.

Documentos de referencia: `docs/superpowers/specs/2026-10-27-finanzas-jaki-design.md` (spec), `docs/auditoria-y-diseno-2026-11.md` (auditoría de noviembre), `docs/instalacion.md` y `docs/vv/01` a `08`.

## 1. Qué se ejecutó

| Verificación | Resultado |
|---|---|
| Frontend: `vitest run` | 27 archivos, 92 pruebas: todas aprobadas |
| Frontend: `vite build` | Compila. Un único chunk JS de 463 kB (159 kB gzip) |
| Backend: pruebas unitarias sin base (`tests/utils`) | 2 archivos, 16 pruebas: todas aprobadas |
| Backend: pruebas de integración | **No ejecutadas.** Escriben en la base de `backend/.env`, que apunta a Neon, y `backend/node_modules` no tiene las dependencias instaladas |

El resto de la auditoría es revisión de código, línea por línea, en backend y frontend.

## 2. Hallazgos de severidad alta

### H-01. El control parental casi no se aplica

- `PERMISOS` define 22 permisos (`backend/src/modules/autorizacion/permisos.js`). El middleware `requierePermiso` (`backend/src/middlewares/requierePermiso.js`) **no se usa en ninguna ruta**.
- Solo se verifican: crear, editar y eliminar gastos fijos (`gastos-fijos.routes.js:74,94,99`) y `gastos.ver_grupo` en Deudas (`deudas.service.js:33`).
- Sin verificación: movimientos (ver, crear, editar, eliminar), presupuestos, estadísticas, categorías, ver gastos fijos, conceptos, pagar cuotas, y todo el módulo de grupos (crear grupo, unirse, invitar, ver y crear gastos compartidos, registrar pagos).
- Consecuencia: un menor sin tutor, o con todos los permisos en "no", usa la app completa salvo los gastos fijos. La pantalla de control parental muestra interruptores que no tienen efecto.
- Contradice la auditoría de noviembre, §3 ("cada ruta declara el permiso que necesita") y §4 ("un menor puede ver los gastos simples del grupo solo si el tutor lo permite"; "sin confirmación, el menor queda sin funciones familiares").

### H-02. Montos de distintas monedas se suman como si fueran pesos

- `dineroActual` (`movimientos.service.js:115`) suma ingresos, gastos y aportes de todas las monedas. `MovimientosView.vue:183` lo muestra con `$`. Un ingreso de USD 100 suma $100.
- `pagarCuota` (`gastos-fijos.service.js:508`) crea el movimiento sin `moneda`. Pagar una cuota de un gasto fijo en USD registra un gasto en ARS (valor por defecto del modelo).
- `GastosFijosView.vue:35-36,203` suma `totalMes` de todos los gastos fijos y lo muestra con `$`, sin separar monedas.
- `crearMovimiento` con `metaId` (`movimientos.service.js:52`) no compara la moneda del movimiento con la de la meta. Un movimiento en USD suma a una meta en ARS.
- Contradice la auditoría de noviembre, §2.6: "Los totales se agrupan por moneda. No hay conversión".

### H-03. Mirar un mes futuro infla las deudas

- `GET /gastos-fijos/:id?mes=AAAA-MM` y `GET /gastos-fijos/vencimientos?mes=` llaman a `asegurarCuotas` con `hasta: mes` (`gastos-fijos.service.js:401,466`). Para los conceptos recurrentes se **guardan** cuotas pendientes hasta ese mes.
- `GastoFijoDetalleView.vue:335` deja elegir cualquier mes con `<input type="month">`.
- `listarDeudas` (`deudas.service.js:15`) toma todas las cuotas pendientes, sin límite de fecha.
- Pasos: tener un gasto fijo recurrente de $10.000, abrir su detalle y elegir un mes 12 meses adelante. Deudas pasa a mostrar 12 cuotas más ($120.000) como pendientes, y quedan así.

### H-04. El código de invitación del grupo llega a todos los miembros

- `obtenerGrupo` oculta el código a quien no es admin (`grupos.service.js:55-56`).
- `listarGruposDeUsuario` usa `dto()`, que siempre incluye `codigo` (`grupos.service.js:24,41`). `GET /api/grupos` lo devuelve a cualquier miembro, menores incluidos.
- Cualquier miembro puede compartir el código y sumar gente sin que el administrador lo sepa.

## 3. Hallazgos de severidad media

| ID | Hallazgo | Evidencia |
|---|---|---|
| M-01 | Varias consultas GET escriben en la base: `GET /presupuestos/estado` registra alertas; `GET /gastos-fijos/vencimientos`, `/recordatorios` y `/:id?mes=` crean cuotas y notificaciones. El informe técnico (§18.2) dice que las alertas "solo se activan ante eventos de mutación de movimientos", y no es así. | `presupuestos.routes.js:21-23`, `presupuestos.service.js:83-87`, `gastos-fijos.service.js:381-452` |
| M-02 | Rendimiento: `asegurarCuotas` hace un `findOrCreate` secuencial por concepto y por mes (hasta 25 meses) en cada GET; Deudas llama a `puede()` una vez por cuota (2 o 3 consultas cada una); la paginación de metas y gastos fijos trae todo y corta en memoria, así que A-04 no reduce la carga de la base. | `gastos-fijos.service.js:110-131`, `deudas.service.js:29-34`, `utils/paginacion.js:16` |
| M-03 | `pagarCuota` lee el estado y después escribe, sin bloqueo. Dos pedidos simultáneos crean dos movimientos para la misma cuota. | `gastos-fijos.service.js:494-526` |
| M-04 | Editar un concepto en cuotas recalcula las cuotas futuras repartiendo el **monto total nuevo** entre todas las cuotas, sin descontar las ya pagadas. Después de pagar 3 de 6 cuotas de $100 y cambiar el total a $1.200, quedan 3 cuotas de $200: la suma da $900, no $1.200. Cambiar `mesInicio` no regenera ninguna cuota. | `gastos-fijos.service.js:293-354` |
| M-05 | El formulario de movimientos ofrece todas las metas, incluidas las de grupo creadas por otros. El backend solo acepta metas propias y responde 404 "Meta no encontrada". El aporte manual, en cambio, acepta metas del grupo. | `FormularioMovimiento.vue:117-120`, `movimientos.service.js:52`, `metas.service.js:85` |
| M-06 | Un gasto fijo de ámbito "grupo" solo lo ve, edita y paga quien lo creó. El resto de los miembros solo lo ve en Deudas. La auditoría de noviembre (§4) dice que lo administran los adultos del grupo. | `gastos-fijos.service.js:22-28,159-161` |
| M-07 | El gráfico de saldos del grupo a lo largo del tiempo (spec §4.8) no está disponible: `saldosHistoricos` no tiene ruta y `GraficoSaldosGrupo.vue` no se usa en ninguna vista. Además, `saldosHistoricos` no separa monedas. | `historico.service.js:47`, `charts/GraficoSaldosGrupo.vue` |
| M-08 | Al salir del grupo o ser quitado, los vínculos tutor-menor y sus permisos siguen vigentes. `puede()` no verifica que el menor siga en el grupo. | `grupos.service.js:89-116`, `autorizacion.service.js:22-29` |
| M-09 | El frontend no lleva al login cuando la sesión vence (falla el refresh) ni maneja el código `FECHA_NACIMIENTO_PENDIENTE`. El usuario solo ve avisos de error. | `services/http.js:32-55`, `router/index.js:122-130` |
| M-10 | La contraseña de las cuentas de demostración está en el repositorio. La auditoría de noviembre (§4) dice que las credenciales "se muestran en el informe final, no en el repositorio". | `backend/scripts/demo-seed.js:16` |

## 4. Hallazgos de severidad baja

| ID | Hallazgo | Evidencia |
|---|---|---|
| B-01 | Editar un gasto compartido por la API sin `participantes` vuelve a repartir en partes iguales entre todos los miembros actuales y borra el reparto personalizado y las categorías de cada participante. La interfaz siempre envía `participantes`, así que solo afecta a otros clientes de la API. | `compartidos.service.js:194,211-220` |
| B-02 | Los aportes a un gasto compartido no tienen tope: la suma puede superar el monto, y el excedente cuenta como gasto en "Mi plata". | `compartidos.service.js:263-279` |
| B-03 | Un miembro con saldo distinto de cero puede salir o ser quitado del grupo. Su saldo sigue apareciendo, con `nombre: null`. | `grupos.service.js:109-116`, `saldos.service.js:50-53` |
| B-04 | La edad en el panel de control parental usa días / 365,25, mientras que la clasificación usa la edad exacta. Cerca del cumpleaños pueden no coincidir. | `control-parental.service.js:42,55-57` |
| B-05 | La spec (§4.6) dice que una categoría sin movimientos se elimina; el código siempre la archiva y no hay forma de desarchivar. | `categorias.service.js:40-45` |
| B-06 | `config/env.js` exige `JWT_SECRET` pero no `DATABASE_URL`, que los documentos marcan como obligatoria. Sin ella el error aparece recién en la primera consulta. | `config/env.js:3-5` |
| B-07 | En el `.env` local, `DATABASE_URL` termina en una comilla `"` que no abre. dotenv la incluye en el valor (`channel_binding=require"`). | `backend/.env:1` |
| B-08 | Crear un gasto fijo con conceptos no es atómico: si falla un concepto, el gasto queda creado a medias. | `gastos-fijos.service.js:222-229` |
| B-09 | El resumen mensual informa `aportesMetas` solo de metas propias en ARS y no lo desglosa por moneda; el histórico sí lo desglosa. Las dos respuestas no son equivalentes. | `estadisticas.service.js:37-45,103-112`, `historico.service.js:31` |

## 5. Inconsistencias en la documentación

### 5.1 Spec del 27/10 (`specs/2026-10-27-finanzas-jaki-design.md`)

Sigue con estado "borrador" y describe funciones que ya no existen o nunca se hicieron: login con Google, módulo y rutas de tarjetas (`/tarjetas`, entidad `Compra`), `vue-chartjs`, carpetas `composables/` y stores por módulo, `express-validator`, ESLint y Prettier. Conviene marcarla como reemplazada y remitir al informe técnico.

### 5.2 Auditoría del 07/11 (`auditoria-y-diseno-2026-11.md`)

- A-05 cita `backend/src/db/models/tarjeta.js`, que no existe. Los datos de tarjeta viven en `gastos_fijos` (§2.4 habla de una tabla `tarjeta`).
- §2.5 describe un proceso mensual que crea el movimiento solo. No existe: el pago de cada cuota es manual (`POST /gastos-fijos/:id/cuotas/:cuotaId/pagar`).
- §2.8 dice que el backend responde `requiereFechaNacimiento: true`. El código responde 403 con `codigo: 'FECHA_NACIMIENTO_PENDIENTE'`.
- §3 y §4: ver H-01. §4 sobre credenciales: ver M-10.

### 5.3 Instalación y `.env.example`

- `docs/instalacion.md` y `backend/.env.example` piden `GOOGLE_CLIENT_ID`, pero la migración `015-quitar-google.js` quitó el login con Google.
- La URL de clonado (`MatiasBorsatto/finanzas-jaki`) no coincide con la del informe técnico (`MatiasBorsatto/platita`).
- R-02 sigue abierto: ningún `package.json` declara `engines`. El informe dice Node ">= 20.x" y la guía dice que la versión mínima no está verificada.

### 5.4 Informe técnico (`vv/08-informe-tecnico.md`) frente a los demás documentos y al código

| Punto del informe | Dato real |
|---|---|
| §6: "16 migraciones" | Hay 19. `06-revision-artefacto.md` habla de 12 |
| §7: bcryptjs 2.4.x | `^3.0.3` en `backend/package.json` |
| §17.2: backend 27 archivos y 211 pruebas; frontend 22 archivos y 80 pruebas | Frontend: 27 archivos y 92 pruebas. Backend: 35 archivos y unos 251 casos |
| §16: ST-13 y ST-14 "Aprobado" | `04-pruebas-sistema.md` las registra como "Pendiente" (no se pudieron verificar) |
| §16: ST-16 es "Flujo completo de grupo", "Aprobado" | En `04` ST-16 es "Login con Google", "Pendiente". Se cambió el caso y su resultado |
| §24.1: "Sí, de forma concluyente" | `04` deja la respuesta "pendiente hasta cerrar esas tres condiciones", y dos siguen abiertas (ST-13/14 y ST-15) |
| §18.2: alertas solo ante mutaciones | Ver M-01 |
| D-13: compras con tarjeta | Ese módulo ya no existe |
| D-14: "Interceptor Axios/Fetch" | No se usa Axios; es `fetch` en `services/http.js` |
| RF-02: categorías "con icono y color propio" | El modelo `Categoria` solo tiene nombre, usuario y archivada |
| RF-03: "búsqueda textual" | `validarFiltros` solo filtra por mes, tipo y categoría |

`03-registro-defectos.md` mantiene como minor "Índice único en `googleId`", que ya no aplica.

Las diferencias de §16 y §24.1 son las más delicadas: el informe presenta como aprobadas pruebas que el registro de ejecución deja pendientes. Conviene alinearlo antes de entregarlo.

## 6. Prioridad sugerida

1. H-01: aplicar `requierePermiso` o `exigir` en las rutas, con pruebas por permiso.
2. H-02: moneda en `pagarCuota`, `dineroActual` por moneda, totales de gastos fijos por moneda y validación de moneda entre movimiento y meta.
3. H-03 y M-01: no generar cuotas ni alertas en los GET, o limitar la generación al mes actual; filtrar Deudas por fecha.
4. H-04: quitar `codigo` de `GET /api/grupos` para quien no es admin.
5. Alinear el informe técnico (§5.4) con `04-pruebas-sistema.md` y con las cifras reales.
6. Resto de hallazgos medios y bajos.
