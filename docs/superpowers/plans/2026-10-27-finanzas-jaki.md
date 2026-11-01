# Finanzas Jaki: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan sintaxis de checkbox (`- [ ]`) para seguimiento.

**Goal:** Construir la aplicación web responsive de finanzas personales con 4 módulos (movimientos, presupuestos, tarjetas, metas), grupos familiares con saldos, y estadísticas con gráficos.

**Architecture:** SPA en Vue 3 que consume una API REST en Express. PostgreSQL vía Sequelize, con migraciones. Lógica de negocio en servicios puros (cálculo de cuotas, reparto, saldos, presupuestos, estadísticas) probados sin base de datos.

**Tech Stack:** Vue 3, Vue Router, Pinia, Chart.js (vue-chartjs), Vite, Node.js, Express, PostgreSQL, Sequelize, sequelize-cli, bcryptjs, jsonwebtoken, cookie-parser, google-auth-library, Jest + Supertest (backend), Vitest + Vue Test Utils (frontend).

**Spec:** [docs/superpowers/specs/2026-10-27-finanzas-jaki-design.md](../specs/2026-10-27-finanzas-jaki-design.md)

> **Nota de repositorio:** la carpeta del proyecto todavía no es un repositorio git. Los pasos de *Commit* asumen que se inicializa con `git init` antes de la Tarea 1. Esa decisión queda pendiente de confirmación del usuario.

## Global Constraints

- Moneda única: ARS. Sin conversión de monedas.
- Montos en columnas `DECIMAL(12,2)`. Nunca `FLOAT`. En código, los montos son `string` con 2 decimales hasta el borde de cálculo.
- Zona horaria de cortes de tarjeta: `America/Argentina/Buenos_Aires`.
- IDs `UUID`. Cada tabla tiene `creado_en` y `actualizado_en`.
- Tokens de sesión en cookies `httpOnly`: `accessToken` (15 min) y `refreshToken` (30 días).
- Un usuario solo accede a sus datos y a los de sus grupos. Acceso ajeno responde **404**.
- Toda operación que toca más de una tabla va dentro de una transacción.
- Responsive: sin scroll horizontal a 375 px de ancho. Contraste suficiente y navegación por teclado.
- Textos de interfaz en español (Argentina).

## Review Focus

1. **Reparto con centavos que no divide exacto** (ej.: $100 entre 3). Las partes deben sumar el total exacto. Los centavos sobrantes se asignan de a uno a los primeros participantes en orden de creación. Pinned by: Tarea 3, Tarea 20.
2. **Cuota con día de cierre o día 31 en meses de 30 días.** La fecha debe ser válida, sin saltear meses ni romper el período. Pinned by: Tarea 3, Tarea 13.
3. **Acceso cruzado entre usuarios o grupos.** Un usuario pide un recurso de otro (movimiento, presupuesto, tarjeta, meta, grupo) y debe recibir 404. Pinned by: Tarea 9, Tarea 18, Tarea 28.
4. **Montos cero, negativos o con más de 2 decimales.** Se rechazan con 400. Pinned by: Tarea 3, Tarea 9.
5. **Saldos del grupo que no suman cero** después de gastos, pagos o regeneración de código. El cálculo debe lanzar error interno si pasa. Pinned by: Tarea 21.

---

## Fase 1: Base del proyecto

### Task 1: Esqueleto del backend

**Files:**
- Create: `backend/package.json`, `backend/src/app.js`, `backend/src/server.js`, `backend/src/config/env.js`
- Test: `backend/tests/health.test.js`

**Interfaces:**
- Produces: `createApp(): Express` en `src/app.js`. La usan los tests y `server.js`.

- [ ] **Step 1: Escribir el test que falla**

```js
test('GET /api/health responde ok', async () => {
  const res = await request(createApp()).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ estado: 'ok' });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd backend && npx jest tests/health.test.js`
Expected: FAIL, `Cannot find module '../src/app'`

- [ ] **Step 3: Implementar `createApp`**

Express con `express.json()`, `cookie-parser`, y la ruta `/api/health`. `env.js` lee variables de entorno y falla si falta `JWT_SECRET`.

- [ ] **Step 4: Verificar que pasa**

Run: `cd backend && npx jest tests/health.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: esqueleto del backend con Express"
```

### Task 2: Base de datos, migraciones y categorías base

**Files:**
- Create: `backend/src/db/sequelize.js`, `backend/src/db/models/index.js`, `backend/src/db/models/usuario.js`, `backend/src/db/models/categoria.js`, `backend/src/db/migrations/001-usuarios-categorias.js`, `backend/src/db/seeders/001-categorias-base.js`
- Test: `backend/tests/db.test.js`

**Interfaces:**
- Produces: `sequelize` en `src/db/sequelize.js`. `{ Usuario, Categoria }` exportados desde `src/db/models/index.js`.
- Modelo `Usuario`: `id`, `nombre`, `email` (único), `passwordHash` (nullable), `googleId` (nullable), `preferenciasEmail` (boolean, default false).
- Modelo `Categoria`: `id`, `nombre`, `usuarioId` (nullable; null = base), `archivada` (boolean).

- [ ] **Step 1: Escribir el test que falla**

```js
test('las categorías base están cargadas', async () => {
  const cantidad = await Categoria.count({ where: { usuarioId: null } });
  expect(cantidad).toBeGreaterThanOrEqual(10);
});
```

- [ ] **Step 2: Verificar que falla**

Run: `cd backend && npx jest tests/db.test.js`
Expected: FAIL, `relation "categorias" does not exist`

- [ ] **Step 3: Implementar modelos, migración y seeder**

Lista base propuesta: Alimentos, Transporte, Servicios, Vivienda, Salud, Educación, Entretenimiento, Ropa, Impuestos, Otros. Ver decisiones pendientes al final.

Run: `npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all`

- [ ] **Step 4: Verificar que pasa**

Run: `cd backend && npx jest tests/db.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: modelos de usuario y categoría con migraciones"
```

### Task 3: Utilidades puras de dinero y fechas

**Files:**
- Create: `backend/src/utils/dinero.js`, `backend/src/utils/fechas.js`, `backend/src/utils/errores.js`
- Test: `backend/tests/utils/dinero.test.js`, `backend/tests/utils/fechas.test.js`

**Interfaces:**
- Produces (`dinero.js`):
  - `validarMonto(valor: unknown): string` — devuelve el monto como `"1234.50"`. Lanza `ErrorValidacion` si no es mayor que 0 o tiene más de 2 decimales.
  - `sumar(montos: string[]): string` — suma exacta en centavos enteros.
  - `dividirEnPartes(total: string, cantidad: number): string[]` — partes que suman `total` exacto; el sobrante se reparte de a 1 centavo desde el inicio.
- Produces (`fechas.js`):
  - `mesDe(fecha: Date): string` — `"AAAA-MM"` en zona Buenos Aires.
  - `diaValido(anio: number, mes: number, dia: number): number` — ajusta el día al último día del mes si no existe (ej.: 31 de febrero → 28 o 29).
  - `periodoResumen(diaCierre: number, mes: string): { desde: Date, hasta: Date }` — el resumen del `mes` cierra el `diaCierre`; `desde` es el día posterior al cierre anterior.
  - `mesDeCuota(fechaCompra: Date, diaCierre: number, numeroCuota: number): string` — la cuota 1 cae en el primer resumen cuyo cierre es igual o posterior a `fechaCompra`. Las siguientes, en meses consecutivos.
- Produces (`errores.js`): clase `ErrorValidacion` con `status = 400`, y `ErrorNoEncontrado` con `status = 404`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
test('dividirEnPartes reparte los centavos sobrantes', () => {
  expect(dividirEnPartes('100.00', 3)).toEqual(['33.34', '33.33', '33.33']);
  expect(sumar(dividirEnPartes('100.00', 3))).toBe('100.00');
});

test('validarMonto rechaza cero, negativos y más de 2 decimales', () => {
  expect(() => validarMonto('0')).toThrow(ErrorValidacion);
  expect(() => validarMonto('-5')).toThrow(ErrorValidacion);
  expect(() => validarMonto('10.005')).toThrow(ErrorValidacion);
  expect(validarMonto('1500.5')).toBe('1500.50');
});

test('mesDeCuota: compra el 31 con cierre el 15 cae en el resumen siguiente', () => {
  expect(mesDeCuota(new Date('2026-01-31'), 15, 1)).toBe('2026-02');
});

test('diaValido ajusta el 31 a febrero', () => {
  expect(diaValido(2026, 2, 31)).toBe(28);
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/utils`
Expected: FAIL, módulos no encontrados

- [ ] **Step 3: Implementar**

Usar aritmética en centavos enteros para todo el cálculo. No usar `Number` para montos fuera de esa conversión.

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/utils`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: utilidades de dinero y fechas de tarjeta"
```

### Task 4: Registro, login, refresh y logout con email

**Files:**
- Create: `backend/src/modules/auth/auth.routes.js`, `auth.controller.js`, `auth.service.js`, `auth.validation.js`, `backend/src/middlewares/autenticar.js`, `backend/src/middlewares/manejarErrores.js`
- Test: `backend/tests/auth.test.js`

**Interfaces:**
- Produces: `registrar({ nombre, email, password }): Promise<Usuario>`. Lanza `ErrorValidacion` si el email ya existe (responde 409).
- Produces: `login({ email, password }): Promise<{ accessToken, refreshToken }>`. Responde 401 con el mismo mensaje si el email o la contraseña son incorrectos.
- Produces: middleware `autenticar(req, res, next)`. Carga `req.usuario = { id, email }`.
- Hash: `bcryptjs` con costo 12.

- [ ] **Step 1: Escribir los tests que fallan**

```js
test('registro crea usuario y devuelve 201', async () => {
  const res = await request(app).post('/api/auth/registro').send({ nombre: 'Ana', email: 'ana@x.com', password: 'clave-segura-1' });
  expect(res.status).toBe(201);
});

test('registro con email repetido responde 409', async () => { /* ... */ });

test('login con contraseña incorrecta responde 401 con mensaje genérico', async () => { /* ... */ });

test('ruta protegida sin cookie responde 401', async () => {
  const res = await request(app).get('/api/usuario/perfil');
  expect(res.status).toBe(401);
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/auth.test.js`
Expected: FAIL, rutas no existen (404)

- [ ] **Step 3: Implementar**

Las rutas `POST /api/auth/registro`, `POST /api/auth/login`, `POST /api/auth/refresh` y `POST /api/auth/logout`. El login setea cookies `httpOnly`, `secure` en producción y `sameSite: 'lax'`.

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/auth.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: registro e inicio de sesión con email y contraseña"
```

### Task 5: Inicio de sesión con Google

**Files:**
- Create: `backend/src/modules/auth/google.service.js`
- Modify: `backend/src/modules/auth/auth.routes.js` (agregar `POST /api/auth/google`)
- Test: `backend/tests/auth-google.test.js`

**Interfaces:**
- Consumes: `Usuario` (Tarea 2), emisión de tokens (Tarea 4).
- Produces: `verificarIdToken(idToken: string): Promise<{ googleId, email, nombre }>`. En tests se reemplaza por un verificador falso inyectado.
- Produces: `loginConGoogle(idToken): Promise<{ accessToken, refreshToken }>`. Orden de búsqueda: por `googleId`; luego por `email` (vincula la cuenta existente); si no existe, crea el usuario sin `passwordHash`.

- [ ] **Step 1: Escribir los tests que fallan**

Tres casos con el verificador falso: crea usuario nuevo; vincula cuenta existente por email sin duplicar; el segundo login con el mismo `googleId` devuelve el mismo usuario.

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/auth-google.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar** `verificarIdToken` con `google-auth-library` y `loginConGoogle`.

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/auth-google.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: inicio de sesión con Google y vinculación por email"
```

### Task 6: Perfil y recuperación de contraseña

**Files:**
- Create: `backend/src/services/email.js`, `backend/src/modules/usuarios/usuarios.routes.js`, `usuarios.service.js`, `backend/src/db/models/token-recuperacion.js` (y migración)
- Test: `backend/tests/perfil.test.js`

**Interfaces:**
- Produces: `enviarEmail({ para, asunto, texto }): Promise<void>`. Transporte SMTP por variables de entorno. En tests se reemplaza por un espía.
- Produces: `solicitarRecuperacion(email): Promise<void>`. Siempre responde 200, exista o no el email (no revela cuentas).
- Produces: `restablecerPassword(token, nuevaPassword): Promise<void>`. El token vence a la hora y es de un solo uso.
- Rutas: `GET /api/usuario/perfil`, `PATCH /api/usuario/perfil` (nombre, email, contraseña con contraseña actual), `POST /api/auth/recuperar`, `POST /api/auth/restablecer`.

- [ ] **Step 1: Escribir los tests que fallan**

- Recuperar con email inexistente responde 200 y no envía email.
- Restablecer con token válido cambia la contraseña.
- Reusar el mismo token responde 400.

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/perfil.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar**

Guardar el token como hash, no en texto plano.

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/perfil.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: perfil y recuperación de contraseña"
```

### Task 7: Categorías (base y personalizadas)

**Files:**
- Create: `backend/src/modules/categorias/categorias.routes.js`, `categorias.controller.js`, `categorias.service.js`
- Test: `backend/tests/categorias.test.js`

**Interfaces:**
- Produces: `listarCategorias(usuarioId): Promise<Categoria[]>`. Devuelve las base y las propias del usuario, sin archivadas.
- Produces: `crearCategoria(usuarioId, { nombre })`, `editarCategoria(usuarioId, id, datos)`, `archivarCategoria(usuarioId, id)`.
- Regla: editar o archivar una categoría base responde **403**. Editar la de otro usuario responde **404**.

- [ ] **Step 1: Escribir los tests que fallan**

Listar incluye base y propias; editar una base responde 403; archivar una propia la saca del listado.

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/categorias.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar**

Eliminar no existe en esta fase. Solo se archiva.

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/categorias.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: categorías base y personalizadas"
```

### Task 8: Base del frontend y acceso

**Files:**
- Create: `frontend/` (Vite + Vue 3): `package.json`, `vite.config.js`, `src/main.js`, `src/App.vue`, `src/router/index.js`, `src/stores/sesion.js`, `src/services/http.js`, `src/services/auth.js`, `src/views/LoginView.vue`, `src/views/RegistroView.vue`, `src/components/LayoutPrincipal.vue`
- Test: `frontend/tests/router.test.js`, `frontend/tests/LoginView.test.js`

**Interfaces:**
- Produces: `http` en `src/services/http.js`. Wrapper de `fetch` con `credentials: 'include'`. Lanza un error con `status` y `mensaje` si la respuesta no es 2xx.
- Produces: store `useSesion()` con `usuario`, `cargarSesion()`, `iniciarSesion(email, password)`, `cerrarSesion()`.
- Router: rutas con `meta.requiereAuth`. Sin sesión redirige a `/login`.
- `LayoutPrincipal.vue`: barra lateral en escritorio, barra inferior en celular.

- [ ] **Step 1: Escribir los tests que fallan**

- Guarda de ruta: sin sesión, `/movimientos` redirige a `/login`.
- `LoginView`: si la API responde 401, muestra el mensaje de error.

- [ ] **Step 2: Verificar que fallan**

Run: `cd frontend && npx vitest run`
Expected: FAIL

- [ ] **Step 3: Implementar**

- [ ] **Step 4: Verificar que pasan**

Run: `cd frontend && npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: base del frontend con login y navegación"
```

---

## Fase 2: Módulo 1 (movimientos) y Módulo 2 (presupuestos)

### Task 9: Movimientos del usuario (backend)

**Files:**
- Create: `backend/src/db/models/movimiento.js`, `backend/src/db/migrations/002-movimientos.js`, `backend/src/modules/movimientos/movimientos.routes.js`, `movimientos.service.js`, `movimientos.validation.js`
- Test: `backend/tests/movimientos.test.js`

**Interfaces:**
- Consumes: `validarMonto` (Tarea 3), `mesDe` (Tarea 3), `ErrorNoEncontrado` (Tarea 3).
- Modelo `Movimiento` (esta fase): `id`, `usuarioId`, `tipo` (`ingreso` | `gasto`), `alcance` (`personal`, fijo en esta fase), `monto` (`DECIMAL(12,2)`), `fecha` (DATEONLY), `descripcion`, `categoriaId`. Las columnas de tarjeta, compra, meta, grupo y pagador se agregan en sus tareas.
- Produces: `crearMovimiento(usuarioId, datos)`, `editarMovimiento(usuarioId, id, datos)`, `eliminarMovimiento(usuarioId, id)`.
- Produces: `listarMovimientos(usuarioId, { mes?, categoriaId?, tipo?, page, limit }): Promise<{ items, total }>`.
- Rutas: `GET/POST /api/movimientos`, `PATCH/DELETE /api/movimientos/:id`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
test('monto con decimales se guarda con 2 decimales', async () => {
  const res = await crearComoAna({ tipo: 'gasto', monto: '1500.5', fecha: '2026-10-03', categoriaId });
  expect(res.body.monto).toBe('1500.50');
});

test('otro usuario no puede editar el movimiento y recibe 404', async () => {
  const res = await patchComoBruno(`/api/movimientos/${movimientoDeAna.id}`, { monto: '1' });
  expect(res.status).toBe(404);
});

test('monto cero responde 400', async () => { /* ... */ });
```

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/movimientos.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar**

Las consultas filtran siempre por `usuarioId`.

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/movimientos.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: movimientos personales con filtros y paginación"
```

### Task 10: Movimientos en el frontend

**Files:**
- Create: `frontend/src/views/MovimientosView.vue`, `frontend/src/components/FormularioMovimiento.vue`, `frontend/src/components/TablaMovimientos.vue`, `frontend/src/services/movimientos.js`
- Test: `frontend/tests/FormularioMovimiento.test.js`, `frontend/tests/TablaMovimientos.test.js`

**Interfaces:**
- Consumes: `http` (Tarea 8), rutas de Tarea 9.
- Produces: `listarMovimientos(filtros)`, `crearMovimiento(datos)`, `editarMovimiento(id, datos)`, `eliminarMovimiento(id)`.

- [ ] **Step 1: Escribir los tests que fallan**

- Formulario no envía con monto vacío y muestra error.
- Tabla muestra montos con formato `$ 1.500,50`.

- [ ] **Step 2: Verificar que fallan**

Run: `cd frontend && npx vitest run tests/FormularioMovimiento.test.js tests/TablaMovimientos.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar.** Tabla en celular se vuelve lista de tarjetas.

- [ ] **Step 4: Verificar que pasan**

Run: `cd frontend && npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: pantalla de movimientos"
```

### Task 11: Presupuestos mensuales (solo gastos personales)

**Files:**
- Create: `backend/src/db/models/presupuesto.js`, `backend/src/db/migrations/003-presupuestos.js`, `backend/src/modules/presupuestos/presupuestos.routes.js`, `presupuestos.service.js`, `presupuestos.calculo.js`
- Test: `backend/tests/presupuestos.test.js`

**Interfaces:**
- Modelo `Presupuesto`: `id`, `usuarioId`, `categoriaId`, `mes` (`AAAA-MM`), `montoLimite`, `regla` (`solo_personal` | `con_compartidos`). Único por (`usuarioId`, `categoriaId`, `mes`).
- Produces (`presupuestos.calculo.js`, puro): `calcularEstado({ montoLimite, consumido }): { restante, porcentaje, alerta }` con `alerta` = `null` | `'80'` | `'100'`.
- Produces: `upsertPresupuesto(usuarioId, { categoriaId, mes, montoLimite, regla })`. En esta fase acepta solo `solo_personal`. `con_compartidos` se habilita en la Tarea 22.
- Produces: `estadoPresupuestos(usuarioId, mes)`. `consumido` = suma de gastos personales de la categoría en el mes.
- Rutas: `GET /api/presupuestos?mes=`, `PUT /api/presupuestos`, `DELETE /api/presupuestos/:id`, `GET /api/presupuestos/estado?mes=`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
test('al llegar al 80% la alerta es "80"', () => {
  expect(calcularEstado({ montoLimite: '1000.00', consumido: '800.00' }).alerta).toBe('80');
});

test('al superar el 100% la alerta es "100"', () => {
  expect(calcularEstado({ montoLimite: '1000.00', consumido: '1000.01' }).alerta).toBe('100');
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/presupuestos.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar** `calcularEstado` y el servicio con las consultas filtradas por usuario.

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/presupuestos.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: presupuestos mensuales por categoría"
```

### Task 12: Alertas dentro de la app y aviso opcional por email

**Files:**
- Create: `backend/src/db/models/notificacion.js`, `backend/src/db/migrations/004-notificaciones.js`, `backend/src/modules/notificaciones/notificaciones.service.js`, `notificaciones.routes.js`, `frontend/src/components/CampanaNotificaciones.vue`
- Test: `backend/tests/notificaciones.test.js`

**Interfaces:**
- Modelo `Notificacion`: `id`, `usuarioId`, `presupuestoId`, `alerta` (`'80'` | `'100'`), `mensaje`, `leida` (boolean). Único por (`presupuestoId`, `alerta`).
- Produces: `registrarAlertaPresupuesto(usuarioId, presupuestoId, alerta, mensaje)`. Crea la notificación una sola vez. Si `Usuario.preferenciasEmail` es true, llama a `enviarEmail` (Tarea 6).
- Rutas: `GET /api/notificaciones`, `PATCH /api/notificaciones/:id/leida`.

- [ ] **Step 1: Escribir los tests que fallan**

- Dos llamadas con la misma alerta crean una sola notificación.
- Con `preferenciasEmail` en false, el espía de `enviarEmail` no se llama.
- Con `preferenciasEmail` en true, se llama una vez.

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/notificaciones.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar.** La campana muestra el contador de no leídas.

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/notificaciones.test.js && cd ../frontend && npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend frontend
git commit -m "feat: alertas de presupuesto dentro de la app con aviso por email opcional"
```

### Task 13: Presupuestos en el frontend

**Files:**
- Create: `frontend/src/views/PresupuestosView.vue`, `frontend/src/components/BarraPresupuesto.vue`, `frontend/src/services/presupuestos.js`
- Test: `frontend/tests/BarraPresupuesto.test.js`

**Interfaces:**
- Consumes: rutas de Tarea 11, campana de Tarea 12.
- `BarraPresupuesto` recibe `{ montoLimite, consumido, alerta }`. Color de advertencia con `alerta` = `'80'` y de error con `'100'`.

- [ ] **Step 1: Escribir el test que falla.** La barra muestra el color de advertencia con alerta `'80'`.

- [ ] **Step 2: Verificar que falla**

Run: `cd frontend && npx vitest run tests/BarraPresupuesto.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar.** La barra muestra también el texto del porcentaje, no solo el color.

- [ ] **Step 4: Verificar que pasa**

Run: `cd frontend && npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: pantalla de presupuestos"
```

---

## Fase 3: Módulo 3 (tarjetas) y Módulo 4 (metas)

### Task 14: Tarjetas y compras en cuotas

**Files:**
- Create: `backend/src/db/models/tarjeta.js`, `backend/src/db/models/compra.js`, `backend/src/db/migrations/005-tarjetas-compras.js`, `backend/src/modules/tarjetas/tarjetas.routes.js`, `tarjetas.service.js`, `compras.service.js`
- Modify: modelo `Movimiento` (agregar `tarjetaId`, `compraId`, y `tipo` acepta `pago_tarjeta`)
- Test: `backend/tests/tarjetas.test.js`

**Interfaces:**
- Modelo `Tarjeta`: `id`, `usuarioId`, `nombre`, `diaCierre` (1–31), `diaVencimiento` (1–31).
- Modelo `Compra`: `id`, `usuarioId`, `tarjetaId`, `montoTotal`, `cuotas`, `modalidad` (`por_cuota` | `compra_completa`), `fecha`.
- Produces: `crearCompra(usuarioId, tarjetaId, { montoTotal, cuotas, modalidad, fecha, categoriaId, descripcion })`.
  - `por_cuota`: genera N movimientos. Monto de cada uno desde `dividirEnPartes(montoTotal, cuotas)`. Mes de cada uno desde `mesDeCuota(fecha, diaCierre, n)`.
  - `compra_completa`: genera un movimiento por el total, en `mesDe(fecha)`.
- Rutas: `GET/POST /api/tarjetas`, `PATCH/DELETE /api/tarjetas/:id`, `POST /api/tarjetas/:id/compras`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
test('por_cuota: $60.000 en 6 cuotas genera 6 movimientos de $10.000 en meses consecutivos', async () => {
  await crearCompra(tarjeta, { montoTotal: '60000.00', cuotas: 6, modalidad: 'por_cuota', fecha: '2026-03-10' });
  const movs = await Movimiento.findAll({ where: { compraId }, order: [['fecha', 'ASC']] });
  expect(movs.map(m => m.monto)).toEqual(Array(6).fill('10000.00'));
  expect(movs).toHaveLength(6);
});

test('por_cuota con centavos: $10.000 en 3 cuotas reparte 3333.34, 3333.33, 3333.33', async () => { /* ... */ });

test('compra_completa genera un único movimiento por el total', async () => { /* ... */ });
```

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/tarjetas.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar** con transacción en `crearCompra`.

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/tarjetas.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: tarjetas y compras en cuotas por modalidad"
```

### Task 15: Resumen de tarjeta, cuotas futuras y pago del resumen

**Files:**
- Create: `backend/src/modules/tarjetas/resumen.service.js`
- Modify: `backend/src/modules/tarjetas/tarjetas.routes.js` (agregar `GET /api/tarjetas/:id/resumen?mes=` y `POST /api/tarjetas/:id/pagos`)
- Test: `backend/tests/resumen-tarjeta.test.js`

**Interfaces:**
- Produces: `resumenTarjeta(usuarioId, tarjetaId, mes): Promise<{ desde, hasta, vencimiento, total, movimientos, cuotasFuturas }>`.
  - `desde` y `hasta` vienen de `periodoResumen`.
  - `vencimiento`: día `diaVencimiento` del mes siguiente al cierre. Es una decisión pendiente, ver al final.
  - `cuotasFuturas`: lista `{ mes, monto }` de las cuotas de compras `compra_completa` que caen después del mes consultado.
- Produces: `registrarPagoResumen(usuarioId, tarjetaId, { monto, fecha })`. Crea un `Movimiento` de `tipo = 'pago_tarjeta'` sin categoría.

- [ ] **Step 1: Escribir los tests que fallan**

- Una compra del 10 del mes con cierre el 15 cae en el resumen de ese mes.
- Una compra `compra_completa` de 6 cuotas aparece en `cuotasFuturas` con 5 entradas.
- `registrarPagoResumen` crea movimiento tipo `pago_tarjeta` sin `categoriaId`.

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/resumen-tarjeta.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar**

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/resumen-tarjeta.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: resumen de tarjeta con cuotas futuras y pago del resumen"
```

### Task 16: Tarjetas en el frontend

**Files:**
- Create: `frontend/src/views/TarjetasView.vue`, `frontend/src/views/TarjetaDetalleView.vue`, `frontend/src/components/FormularioCompra.vue`, `frontend/src/services/tarjetas.js`
- Test: `frontend/tests/FormularioCompra.test.js`

**Interfaces:**
- Consumes: rutas de Tarea 14 y 15.
- `FormularioCompra` muestra dos opciones de modalidad con texto explicativo: "Contar cada cuota en su mes" y "Registrar la compra completa".

- [ ] **Step 1: Escribir el test que falla.** Al enviar, el payload incluye `modalidad` con el valor elegido.

- [ ] **Step 2: Verificar que falla**

Run: `cd frontend && npx vitest run tests/FormularioCompra.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar.** La vista de detalle muestra el resumen con cierre, vencimiento y cuotas futuras.

- [ ] **Step 4: Verificar que pasa**

Run: `cd frontend && npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: pantallas de tarjetas y compras en cuotas"
```

### Task 17: Metas personales y aportes

**Files:**
- Create: `backend/src/db/models/meta.js`, `backend/src/db/models/aporte-meta.js`, `backend/src/db/migrations/006-metas.js`, `backend/src/modules/metas/metas.routes.js`, `metas.service.js`, `metas.calculo.js`
- Modify: modelo `Movimiento` (agregar `metaId` nullable)
- Test: `backend/tests/metas.test.js`

**Interfaces:**
- Modelo `Meta`: `id`, `usuarioId`, `grupoId` (nullable; null = personal; se usa en la Tarea 21), `nombre`, `montoObjetivo`, `fechaLimite` (nullable).
- Modelo `AporteMeta`: `id`, `metaId`, `monto` (negativo = retiro), `fecha`, `movimientoId` (nullable).
- Produces: `crearMeta(usuarioId, { nombre, montoObjetivo, fechaLimite })`.
- Produces: `registrarAporte(usuarioId, metaId, { monto, fecha })`. Monto manual positivo. Un retiro se registra con monto negativo.
- Produces (`metas.calculo.js`, puro): `progresoMeta({ montoObjetivo, acumulado }): { porcentaje, restante }`.
- Regla de movimiento asociado: al crear un `Movimiento` con `metaId`, si es `ingreso` se crea un aporte positivo; si es `gasto`, un aporte negativo (retiro). Ambos con `movimientoId`.
- Rutas: `GET/POST /api/metas`, `PATCH/DELETE /api/metas/:id`, `POST /api/metas/:id/aportes`.

- [ ] **Step 1: Escribir los tests que fallan**

- Aporte manual de `5000.00` a una meta de `20000.00` da 25%.
- Movimiento `ingreso` con `metaId` crea un aporte positivo con `movimientoId`.
- Movimiento `gasto` con `metaId` crea un aporte negativo.

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/metas.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar** la creación del aporte dentro de la misma transacción que el movimiento (lo llama la Tarea 9 mediante el servicio de metas).

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/metas.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: metas de ahorro con aportes manuales y asociados a movimientos"
```

### Task 18: Metas en el frontend

**Files:**
- Create: `frontend/src/views/MetasView.vue`, `frontend/src/components/BarraMeta.vue`, `frontend/src/services/metas.js`
- Modify: `frontend/src/components/FormularioMovimiento.vue` (selector opcional de meta)
- Test: `frontend/tests/BarraMeta.test.js`

**Interfaces:**
- Consumes: rutas de Tarea 17.
- `BarraMeta` recibe `{ montoObjetivo, acumulado }` y muestra porcentaje y restante.

- [ ] **Step 1: Escribir el test que falla.** Con objetivo `20000` y acumulado `5000`, muestra "25 %" y "$ 15.000,00 restante".

- [ ] **Step 2: Verificar que falla**

Run: `cd frontend && npx vitest run tests/BarraMeta.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar.**

- [ ] **Step 4: Verificar que pasa**

Run: `cd frontend && npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: pantalla de metas y aportes"
```

---

## Fase 4: Grupo familiar

### Task 19: Grupos, código, membresía y roles

**Files:**
- Create: `backend/src/db/models/grupo.js`, `backend/src/db/models/miembro-grupo.js`, `backend/src/db/migrations/007-grupos.js`, `backend/src/modules/grupos/grupos.routes.js`, `grupos.service.js`, `backend/src/middlewares/grupoAccesible.js`
- Test: `backend/tests/grupos.test.js`

**Interfaces:**
- Modelo `Grupo`: `id`, `nombre`, `codigo` (único), `creadoPor`.
- Modelo `MiembroGrupo`: `id`, `grupoId`, `usuarioId`, `rol` (`admin` | `miembro`). Único por (`grupoId`, `usuarioId`).
- Produces: `crearGrupo(usuarioId, nombre): Promise<Grupo>`. El creador queda como `admin`.
- Produces: `listarGruposDeUsuario(usuarioId)`. Un usuario puede tener varios grupos.
- Produces: `unirseConCodigo(usuarioId, codigo)`. Código inválido o regenerado responde 400.
- Produces: `regenerarCodigo(adminId, grupoId)`.
- Produces: `quitarMiembro(adminId, grupoId, usuarioId)`.
- Produces: `salirDeGrupo(usuarioId, grupoId)`. Si es el último admin, responde 409 hasta que designe otro.
- Middleware `grupoAccesible(rol?)`. Si el usuario no es miembro, responde 404. Si se pide `admin` y no lo es, responde 403.
- Rutas: `POST /api/grupos`, `GET /api/grupos`, `POST /api/grupos/unirse`, `POST /api/grupos/:id/codigo/regenerar`, `DELETE /api/grupos/:id/miembros/:usuarioId`, `POST /api/grupos/:id/salir`.

- [ ] **Step 1: Escribir los tests que fallan**

- Usuario que no es miembro pide `GET /api/grupos/:id` y recibe 404.
- Unirse con el código anterior tras regenerar responde 400.
- El último admin que sale recibe 409.
- Un usuario puede estar en dos grupos a la vez.

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/grupos.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar**

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/grupos.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: grupos familiares con código, roles y membresía"
```

### Task 20: Invitaciones por email

**Files:**
- Create: `backend/src/db/models/invitacion.js`, `backend/src/db/migrations/008-invitaciones.js`, `backend/src/modules/grupos/invitaciones.service.js`
- Modify: `backend/src/modules/grupos/grupos.routes.js` (agregar rutas)
- Test: `backend/tests/invitaciones.test.js`

**Interfaces:**
- Modelo `Invitacion`: `id`, `grupoId`, `email`, `token` (hash), `estado` (`pendiente` | `aceptada` | `cancelada` | `expirada`), `expiraEn`.
- Produces: `invitar(adminId, grupoId, email)`. Genera token de 32 bytes, vence a los 7 días, y envía el enlace con `enviarEmail` (Tarea 6).
- Produces: `aceptarInvitacion(usuarioId, token)`. El email del usuario debe coincidir con el de la invitación; si no, responde 403. Vencida responde 400.
- Produces: `cancelarInvitacion(adminId, invitacionId)`.
- Rutas: `POST /api/grupos/:id/invitaciones`, `POST /api/invitaciones/aceptar`, `DELETE /api/grupos/:id/invitaciones/:invitacionId`.

- [ ] **Step 1: Escribir los tests que fallan**

- Invitación vencida responde 400.
- Aceptar con otro email responde 403.
- Aceptar con el email correcto crea el miembro y marca la invitación `aceptada`.

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/invitaciones.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar**

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/invitaciones.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: invitaciones por email a grupos familiares"
```

### Task 21: Gastos compartidos y participaciones

**Files:**
- Create: `backend/src/db/models/participacion-gasto.js`, `backend/src/db/migrations/009-gastos-compartidos.js`, `backend/src/modules/movimientos/compartidos.service.js`
- Modify: modelo `Movimiento` (agregar `grupoId`, `pagadorId`; `alcance` acepta `compartido`), rutas de movimientos
- Test: `backend/tests/gastos-compartidos.test.js`

**Interfaces:**
- Consumes: `dividirEnPartes`, `sumar` (Tarea 3), `esMiembro` de Tarea 19.
- Modelo `ParticipacionGasto`: `id`, `movimientoId`, `usuarioId`, `monto`.
- Produces: `crearGastoCompartido(usuarioId, { grupoId, pagadorId, monto, fecha, categoriaId, descripcion, participantes? })`.
  - Sin `participantes`: se toman todos los miembros del grupo, en partes iguales con `dividirEnPartes`.
  - Con `participantes = [{ usuarioId, monto }]`: la suma debe ser igual a `monto`. Si no, responde 400.
  - Pagador y participantes deben ser miembros del grupo. Si no, responde 400.
- Regla: el movimiento compartido guarda `pagadorId` y `alcance = 'compartido'`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
test('$100 entre 3 miembros se reparte 33.34, 33.33, 33.33', async () => { /* ... */ });

test('participaciones personalizadas que no suman el total responden 400', async () => { /* ... */ });

test('participante que no es miembro responde 400', async () => { /* ... */ });
```

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/gastos-compartidos.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar** en transacción.

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/gastos-compartidos.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: gastos compartidos con reparto igual o personalizado"
```

### Task 22: Saldos y pagos entre miembros

**Files:**
- Create: `backend/src/modules/saldos/saldos.calculo.js` (puro), `backend/src/modules/saldos/saldos.service.js`, `backend/src/db/models/pago-entre-miembros.js`, `backend/src/db/migrations/010-pagos-entre-miembros.js`, `backend/src/modules/saldos/saldos.routes.js`
- Test: `backend/tests/saldos.test.js`

**Interfaces:**
- Produces (`saldos.calculo.js`, puro): `calcularSaldos({ pagadoPorUsuario, participacionPorUsuario, pagosRealizados, pagosRecibidos }): Map<usuarioId, string>`.
  - Fórmula: `saldo = pagado − participación + pagosRealizados − pagosRecibidos`.
  - Positivo: le deben dinero. Negativo: debe dinero.
  - Si la suma de todos los saldos no es `0.00`, lanza `ErrorInterno` (invariante violada).
- Produces: `saldosDelGrupo(usuarioId, grupoId)`. Calcula por grupo a partir de movimientos compartidos, participaciones y pagos.
- Produces: `registrarPago(usuarioId, grupoId, { deudorId, acreedorId, monto, fecha, nota })`. Ambos deben ser miembros del grupo.
- Rutas: `GET /api/grupos/:id/saldos`, `POST /api/grupos/:id/pagos`, `GET /api/grupos/:id/pagos`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
test('ejemplo de la especificación: A pagó 100, B debe 50', () => {
  const s = calcularSaldos({
    pagadoPorUsuario: { A: '100.00' },
    participacionPorUsuario: { A: '50.00', B: '50.00' },
    pagosRealizados: {}, pagosRecibidos: {},
  });
  expect(s.get('A')).toBe('50.00');
  expect(s.get('B')).toBe('-50.00');
});

test('después de que B paga 50 a A, ambos quedan en 0.00', () => { /* ... */ });

test('suma de saldos distinta de cero lanza ErrorInterno', () => { /* ... */ });
```

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/saldos.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar** en centavos enteros.

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/saldos.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: saldos por grupo y pagos entre miembros"
```

### Task 23: Presupuestos con compartidos y metas de grupo

**Files:**
- Modify: `backend/src/modules/presupuestos/presupuestos.service.js`, `presupuestos.calculo.js`, `backend/src/modules/metas/metas.service.js`
- Test: `backend/tests/presupuestos-compartidos.test.js`, `backend/tests/metas-grupo.test.js`

**Interfaces:**
- Produces: `consumoPresupuesto(usuarioId, categoriaId, mes, regla)`.
  - `solo_personal`: suma de gastos personales.
  - `con_compartidos`: gastos personales más la suma de `ParticipacionGasto.monto` del usuario en gastos compartidos de esa categoría, de **todos** sus grupos, en ese mes.
- Habilita `regla = 'con_compartidos'` en `upsertPresupuesto`.
- `crearMeta` acepta `grupoId`. Solo miembros del grupo pueden crearla (404 si no lo son). Cualquier miembro puede registrar aportes. El progreso es compartido.

- [ ] **Step 1: Escribir los tests que fallan**

- Presupuesto `con_compartidos` suma su parte de dos grupos distintos.
- Presupuesto `solo_personal` no incluye compartidos.
- Un miembro de otro grupo no puede aportar a una meta de grupo (404).

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/presupuestos-compartidos.test.js tests/metas-grupo.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar**

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest`
Expected: PASS (toda la suite)

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: presupuestos con gastos compartidos de todos los grupos y metas de grupo"
```

### Task 24: Grupos en el frontend

**Files:**
- Create: `frontend/src/views/GruposView.vue`, `frontend/src/views/GrupoDetalleView.vue`, `frontend/src/components/SaldosGrupo.vue`, `frontend/src/components/FormularioGastoCompartido.vue`, `frontend/src/components/PagosGrupo.vue`, `frontend/src/services/grupos.js`
- Modify: `frontend/src/components/FormularioMovimiento.vue` (alcance compartido: elegir grupo y reparto)
- Test: `frontend/tests/SaldosGrupo.test.js`, `frontend/tests/FormularioGastoCompartido.test.js`

**Interfaces:**
- Consumes: rutas de Tarea 19–23.
- `SaldosGrupo` recibe la lista `[{ usuarioId, nombre, saldo }]`. Muestra "te deben" o "debés" según el signo, y el botón "Registrar pago".
- `FormularioGastoCompartido` muestra el reparto igual por defecto y permite editar montos por persona. Bloquea el envío si la suma no coincide con el total.

- [ ] **Step 1: Escribir los tests que fallan**

- Saldo negativo muestra "debés" y positivo "te deben".
- Reparto personalizado con suma distinta deshabilita el botón de enviar.

- [ ] **Step 2: Verificar que fallan**

Run: `cd frontend && npx vitest run tests/SaldosGrupo.test.js tests/FormularioGastoCompartido.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar**

- [ ] **Step 4: Verificar que pasan**

Run: `cd frontend && npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: pantallas de grupos, gastos compartidos, saldos y pagos"
```

---

## Fase 5: Estadísticas y gráficos

### Task 25: Resumen mensual

**Files:**
- Create: `backend/src/modules/estadisticas/resumenMensual.calculo.js` (puro), `backend/src/modules/estadisticas/estadisticas.routes.js`, `estadisticas.service.js`
- Test: `backend/tests/resumen-mensual.test.js`

**Interfaces:**
- Produces (`resumenMensual.calculo.js`, puro): `calcularResumen(movimientos, presupuestos)`.
- Reglas:
  - `ingresos` = suma de movimientos `ingreso`.
  - `gastos` = suma de gastos personales más la parte del usuario en gastos compartidos.
  - Los movimientos `pago_tarjeta` **no** cuentan en ingresos ni gastos. Sus compras ya están contadas. Evita contarlas dos veces.
  - `ahorroNeto` = `ingresos − gastos`. Los aportes a metas no se descuentan.
  - `gastosPorCategoria`: lista `{ categoriaId, nombre, monto }`.
  - `presupuestos`: estado de cada uno, de `calcularEstado` (Tarea 11).
  - `aportesMetas`: suma de aportes del mes, informativo.
- Produces: `resumenMensual(usuarioId, mes)`.
- Ruta: `GET /api/estadisticas/mensual?mes=`.

- [ ] **Step 1: Escribir los tests que fallan**

- Un `pago_tarjeta` no altera ingresos ni gastos.
- Un aporte a meta no altera `ahorroNeto`.
- `ingresos 100000`, `gastos 60000` → `ahorroNeto '40000.00'`.

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/resumen-mensual.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar** con aritmética en centavos (`sumar` de Tarea 3).

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/resumen-mensual.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: resumen mensual de ingresos, gastos y ahorro neto"
```

### Task 26: Datos históricos

**Files:**
- Create: `backend/src/modules/estadisticas/historico.calculo.js` (puro), `historico.service.js`
- Modify: `backend/src/modules/estadisticas/estadisticas.routes.js` (agregar `GET /api/estadisticas/historico?desde=&hasta=`)
- Test: `backend/tests/historico.test.js`

**Interfaces:**
- Produces: `serieHistorica(usuarioId, desde, hasta)`, que devuelve `[{ mes, ingresos, gastos, ahorroNeto, gastosPorCategoria, aportesMetas }]` por mes en el rango.
- Produces: `saldosHistoricos(usuarioId, grupoId, desde, hasta)`, que devuelve `[{ mes, saldos: [{ usuarioId, saldo }] }]`.
- Rango máximo: 24 meses. Más de eso responde 400.

- [ ] **Step 1: Escribir los tests que fallan**

- Serie de 3 meses devuelve 3 entradas en orden.
- Rango de 25 meses responde 400.
- Los meses sin movimientos aparecen con ceros.

- [ ] **Step 2: Verificar que fallan**

Run: `cd backend && npx jest tests/historico.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar**

- [ ] **Step 4: Verificar que pasan**

Run: `cd backend && npx jest tests/historico.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: series históricas de estadísticas"
```

### Task 27: Pantalla de estadísticas con gráficos

**Files:**
- Create: `frontend/src/views/EstadisticasView.vue`, `frontend/src/charts/GraficoIngresosGastos.vue`, `frontend/src/charts/GraficoGastosPorCategoria.vue`, `frontend/src/charts/GraficoAhorroNeto.vue`, `frontend/src/charts/GraficoSaldosGrupo.vue`, `frontend/src/services/estadisticas.js`
- Test: `frontend/tests/graficos.test.js`

**Interfaces:**
- Consumes: `GET /api/estadisticas/mensual` (Tarea 25), `GET /api/estadisticas/historico` (Tarea 26).
- Cada componente de gráfico recibe `datos` ya procesados y no hace llamadas a la API.
- Vista: selector de mes para el resumen, y selector de rango para los históricos.
- Chart.js se importa con los módulos necesarios, no el paquete completo.

- [ ] **Step 1: Escribir el test que falla.** `GraficoIngresosGastos` pasa al gráfico dos datasets, "Ingresos" y "Gastos", con los valores recibidos. Chart.js se reemplaza por un espía.

- [ ] **Step 2: Verificar que falla**

Run: `cd frontend && npx vitest run tests/graficos.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar.** Cada gráfico tiene texto alternativo y una tabla accesible con los mismos datos.

- [ ] **Step 4: Verificar que pasa**

Run: `cd frontend && npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: pantalla de estadísticas con gráficos mensuales e históricos"
```

---

## Fase 6: Pulido y pruebas finales

### Task 28: Responsive y accesibilidad

**Files:**
- Create: `frontend/src/styles/tokens.css`
- Modify: layouts y vistas que tengan tablas o barras laterales
- Test: verificación manual con el navegador integrado

**Interfaces:**
- Tokens de color en `:root`, con variantes para modo oscuro.
- Las tablas se convierten en listas de tarjetas por debajo de 640 px.

- [ ] **Step 1: Escribir la verificación.** En 375 px de ancho, en cada vista principal: `document.documentElement.scrollWidth <= window.innerWidth`.

- [ ] **Step 2: Ejecutar la verificación y registrar los fallos**

Run: `preview_start` con el frontend, luego `javascript_tool` con la expresión de arriba en cada ruta.
Expected: `true` en todas las rutas.

- [ ] **Step 3: Corregir** los desbordes que aparezcan.

- [ ] **Step 4: Repetir la verificación**

Expected: `true` en todas las rutas. Además, navegación completa por teclado en login, movimientos y grupos.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "fix: diseño responsive a 375 px y accesibilidad por teclado"
```

### Task 29: Pruebas de aislamiento y flujo completo

**Files:**
- Create: `backend/tests/aislamiento.test.js`, `backend/tests/flujo-completo.test.js`

**Interfaces:**
- Consumes: todos los servicios de las tareas anteriores.

- [ ] **Step 1: Escribir las pruebas que fallan**

- Aislamiento: el usuario B recibe 404 en cada recurso del usuario A (movimiento, presupuesto, tarjeta, compra, meta, grupo, pago). Una prueba por recurso.
- Flujo completo: registro, crear grupo, invitar, aceptar, gasto compartido de $100 entre 3, saldos suman cero, un pago de saldo, saldos vuelven a cero.

- [ ] **Step 2: Verificar que fallan o pasan**

Run: `cd backend && npx jest tests/aislamiento.test.js tests/flujo-completo.test.js`
Expected: si algún recurso no está protegido, FAIL con el recurso indicado.

- [ ] **Step 3: Corregir** lo que falle.

- [ ] **Step 4: Verificar que toda la suite pasa**

Run: `cd backend && npx jest && cd ../frontend && npx vitest run`
Expected: PASS en ambas.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "test: aislamiento entre usuarios y flujo completo de grupo"
```

---

## Decisiones de implementación

Elegí estos puntos para avanzar. El spec no los define. Revisalos antes de empezar:

1. **Hash de contraseñas:** `bcryptjs` (el spec dice "bcrypt o argon2").
2. **Lista base de categorías:** Alimentos, Transporte, Servicios, Vivienda, Salud, Educación, Entretenimiento, Ropa, Impuestos, Otros.
3. **Vencimiento de tarjeta:** día `diaVencimiento` del mes siguiente al cierre.
4. **Compra completa:** el total se registra en el mes calendario de la compra. Las cuotas futuras se muestran sin crear movimientos.
5. **Pagos de tarjeta:** no cuentan en ingresos ni gastos del resumen, para no duplicar las compras.
6. **Gastos del resumen:** incluyen la parte que le toca al usuario en gastos compartidos.
7. **Participantes por defecto:** todos los miembros del grupo en el momento de cargar el gasto.
8. **Invitaciones:** vencen a los 7 días, y solo las puede aceptar el email invitado.
9. **Repositorio git:** inicializar con `git init` antes de la Tarea 1.

## Corrección a la especificación

Al revisar este plan se detectó un error de signo en la sección 5.2 de la especificación: los pagos entre miembros tenían la fórmula invertida. Ya se corrigió en el documento: `saldo = pagado − participación + pagos realizados − pagos recibidos`, con un ejemplo que lo verifica.
