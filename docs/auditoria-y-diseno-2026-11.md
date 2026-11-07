# Auditoría y diseño: control parental, gastos fijos, tarjetas y multimoneda

Fecha: 07/11/2026. Alcance: revisión del código existente (backend y frontend) y diseño de las funciones nuevas. Este documento no modifica el código.

## 1. Auditoría del código actual

### 1.1 Lo que está bien

- Las consultas de movimientos, tarjetas, presupuestos y metas filtran por `usuarioId`. Se revisaron las consultas sin filtro y en todos los casos el filtro está en otra cláusula o es intencional (categorías base).
- El acceso a grupos pasa por el middleware `grupoAccesible`, que responde 404 a los no miembros y 403 cuando se exige rol admin.
- Los IDs que no son UUID se rechazan con 404 (`validarIdParam`).
- Hay 20 índices declarados en las migraciones.

### 1.2 Hallazgos

| ID | Hallazgo | Impacto | Evidencia | Prioridad |
|---|---|---|---|---|
| A-01 | `serieHistorica` ejecuta dos consultas en paralelo por mes, en 24 rondas secuenciales (48 consultas en total). | Latencia que crece con el rango de meses | `backend/src/modules/estadisticas/historico.service.js` | Alta |
| A-02 | `presupuestos` llama a `Promise.all` con una consulta por presupuesto (N+1). Ya estaba anotado como minor. | Crece con la cantidad de presupuestos | `presupuestos.service.js:63` | Media |
| A-03 | `compartidos` verifica la categoría de cada participante con una consulta. | Crece con la cantidad de miembros | `compartidos.service.js:65,117` | Baja |
| A-04 | Los listados no tienen paginación en 7 de 11 servicios que usan `findAll`. | Riesgo de respuestas grandes | `grep findAll` | Media |
| A-05 | El modelo `Tarjeta` solo tiene nombre, día de cierre y día de vencimiento. No tiene tipo (crédito o débito), últimos cuatro dígitos, banco ni titular. | Bloquea la funcionalidad de tarjetas pedida | `backend/src/db/models/tarjeta.js` | Requerido por el pedido |
| A-06 | No existe concepto de tutor ni de menor. Los roles solo existen dentro de un grupo (admin o miembro). | Bloquea el control parental | `backend/src/db/models/miembro-grupo.js` | Requerido por el pedido |
| A-07 | No hay fecha de nacimiento en el usuario. | Bloquea la clasificación por edad | `backend/src/db/models/usuario.js` | Requerido por el pedido |
| A-08 | No hay control de cambios de permisos ni auditoría de acciones de administración. | Sin trazabilidad | No existe tabla de auditoría | Requerido por el pedido |
| A-09 | El frontend no tiene paginación en las listas. | Carga inicial más pesada | `MovimientosView` tiene paginación; el resto no | Media |

### 1.3 Optimizaciones que se harán

1. **A-01:** una sola consulta por rango de fechas, agrupada por mes en memoria. Reduce 48 consultas a 2.
2. **A-02:** cargar todos los presupuestos con sus consumos en una consulta agregada.
3. **A-04:** paginación en los listados que crecen con el uso (movimientos ya la tiene; se agrega a tarjetas, metas y gastos compartidos).

No se harán optimizaciones que empeoren la legibilidad si el impacto es pequeño (A-03).

## 2. Modelo de datos nuevo

### 2.1 Usuario

- `fechaNacimiento` (DATE, nullable para usuarios existentes).
- La condición de adulto o menor **no se guarda**: se calcula en el backend a partir de la fecha. Así, al cumplir 18 años la clasificación cambia sola, sin una migración de datos.

### 2.2 Vínculo tutor-menor

Tabla `vinculo_tutor`:
- `tutorId`, `menorId` (FK a `usuario`), `grupoId` (FK a `grupo`).
- Restricción única por (`tutorId`, `menorId`).
- Un menor puede tener más de un tutor. El vínculo solo existe dentro de un grupo.

### 2.3 Permisos

Tabla `permiso_menor`: una fila por (`vinculoId`, `permiso`), con `permitido` (booleano). La lista de permisos vive en un único módulo del backend (`permisos.js`), y el backend rechaza cualquier permiso que no esté en esa lista.

Matriz de permisos (la del pedido). Los permisos de tarjetas tienen un valor fijo en `false` que el backend no permite cambiar.

### 2.4 Tarjetas (ampliación)

Tabla `tarjeta`, columnas nuevas:
- `tipo`: `credito` o `debito`.
- `ultimosCuatro`: CHAR(4), validado con `^\d{4}$`.
- `banco`, `titular`, `alias`.

Nunca se guardan número completo, CVV ni PIN. El frontend no tiene campos para ellos.

### 2.5 Gastos fijos

Tabla `gasto_fijo`:
- `usuarioId`, `grupoId` (nullable, cuando el ámbito es del grupo).
- `ambito`: `propio` o `grupo`.
- `tipoPago`: `simple`, `tarjeta_credito` o `tarjeta_debito`.
- `tarjetaId` (nullable), obligatorio cuando `tipoPago` es de tarjeta.
- `monto`, `moneda`, `categoriaId`, `descripcion`.
- `frecuencia`: mensual. `diaDelMes` (1 a 28, para no depender de meses cortos).
- `activo`, `proximaEjecucion`.

Cada mes, un proceso crea el movimiento correspondiente (tipo gasto, con `gastoFijoId` como referencia). El proceso es idempotente: si ya existe el movimiento del mes, no lo duplica.

### 2.6 Multimoneda

- `moneda` (CHAR(3), `ARS` por defecto) en `movimiento`, `gasto_fijo` y `presupuesto`.
- Los totales se agrupan por moneda. No hay conversión.
- Las estadísticas muestran una sección por moneda.

### 2.7 Auditoría

Tabla `registro_auditoria`: `usuarioId` (quién), `accion`, `entidad`, `entidadId`, `detalle` (JSON sin datos sensibles), `creadoEn`.
Se registran cambios de permisos, altas y bajas de vínculos, y cambios de tarjetas.

### 2.8 Migración de usuarios existentes

- Se agrega la columna `fechaNacimiento` como nullable. Nada se borra.
- Al iniciar sesión sin fecha, el backend responde con un indicador `requiereFechaNacimiento: true`. El frontend muestra un paso obligatorio para cargarla antes de seguir.
- Sin fecha, el usuario no puede crear gastos fijos ni vincular menores.

## 3. Autorización

Un solo lugar decide qué puede hacer cada usuario: `autorizacion.js`. Cada ruta declara el permiso que necesita, y el middleware:

1. Calcula la clasificación del usuario a partir de su fecha de nacimiento.
2. Si es menor, busca el vínculo con el tutor y el permiso en `permiso_menor`.
3. Rechaza con 403 cualquier acción sobre tarjetas para menores, sin importar la configuración.
4. Nunca toma el rol o la edad del cuerpo de la petición.

Los menores no pueden cambiar sus propios permisos. Solo un tutor del mismo grupo puede hacerlo.

## 4. Riesgos y decisiones pendientes

- **Gastos del grupo:** un gasto fijo del grupo lo administran los adultos del grupo. Un menor puede ver los gastos simples del grupo solo si el tutor lo permite.
- **Cuenta de menor:** los menores se crean desde su propio registro con fecha de nacimiento. La vinculación con el tutor la confirma el tutor desde su panel. Sin confirmación, el menor queda sin funciones familiares.
- **Cumplir 18 años:** la clasificación cambia en la próxima consulta. Los permisos guardados se conservan, pero dejan de aplicarse porque el backend ya no clasifica al usuario como menor. Esto evita tener que recalcular permisos en un proceso aparte.
- **Demostración:** los seeders solo corren con una variable `ENTORNO_DEMO=true` y se rechazan si `NODE_ENV=production`. Las credenciales de demostración se muestran en el informe final, no en el repositorio.

## 5. Orden de implementación

1. Migraciones: fecha de nacimiento, vínculos, permisos, tarjetas, gastos fijos, moneda y auditoría. Sin cambios destructivos.
2. Autorización centralizada y pruebas de autorización.
3. Optimizaciones A-01 a A-04, con pruebas de que los resultados no cambian.
4. Gastos fijos y su proceso mensual.
5. Control parental en el backend y luego en la interfaz.
6. Registro con fecha de nacimiento y paso para usuarios existentes.
7. Multimoneda en totales y estadísticas.
8. Seeders de demostración y credenciales.
9. Informe final con dictamen PASS, WARNING o BLOCK.

Cada paso termina con las suites en verde y un commit propio.
