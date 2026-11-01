# Finanzas Jaki: diseño y arquitectura

- **Fecha:** 2026-10-27
- **Estado:** borrador para revisión
- **Moneda:** ARS (pesos argentinos), sin conversión de monedas

---

## 1. Objetivo

Aplicación web responsive para gestionar finanzas personales y familiares. Cada usuario administra sus propios movimientos, presupuestos, tarjetas y ahorros. Además, puede integrarse a un **grupo familiar** donde se comparten gastos y se calculan saldos entre miembros. La app muestra estadísticas y gráficos con resúmenes mensuales e históricos.

## 2. Alcance

**Incluido**

- Tres módulos funcionales con gestión distinta: Ingresos y gastos diarios, Presupuestos mensuales, Tarjetas de crédito. Y un cuarto módulo: Ahorros y metas.
- Grupo familiar mixto: gastos personales y gastos compartidos repartibles.
- Saldos entre miembros y registro de pagos para saldarlos.
- Estadísticas: resumen mensual y gráficos históricos.
- Autenticación con email y contraseña, y con Google.

**Excluido por ahora**

- Módulo de Deudas y préstamos (descartado por el usuario).
- Conversión entre monedas.
- Integración bancaria automática.

## 3. Usuarios y roles

- **Usuario:** persona registrada con cuenta propia.
- **Administrador del grupo:** usuario que creó el grupo. Puede invitar miembros y regenerar el código del grupo.
- **Miembro del grupo:** usuario que se unió al grupo. Puede cargar gastos compartidos y registrar pagos.

Cada usuario solo ve sus datos personales. Los datos compartidos se ven únicamente dentro de su grupo.

## 4. Requisitos funcionales

### 4.1 Cuenta y acceso

- Registro e inicio de sesión con **email y contraseña**.
- Inicio de sesión con **Google**. Si el email de Google coincide con una cuenta existente, se vinculan las cuentas.
- Recuperación de contraseña por email.
- Edición de perfil (nombre, email, contraseña).

### 4.2 Módulo 1: Ingresos y gastos diarios

- Registrar ingresos y gastos con: monto (ARS), fecha, categoría, descripción.
- Cada movimiento tiene un **alcance**: *personal* o *compartido* (ver sección 5).
- Editar y eliminar movimientos propios.
- Listado con filtros por mes, categoría, tipo y alcance.
- Los pagos de resúmenes de tarjeta se registran aquí como movimientos (ver 4.4).

### 4.3 Módulo 2: Presupuestos mensuales

- Crear un presupuesto por **categoría** y **mes**, con un monto límite.
- Cada presupuesto define su **regla de consumo**:
  - *Solo personal:* cuenta únicamente los gastos personales de esa categoría.
  - *Con compartidos:* cuenta los gastos personales más la **parte que le corresponde** al usuario en los gastos compartidos de **todos sus grupos**.
- Mostrar consumido, restante y porcentaje usado. Avisar dentro de la app al superar el 80% y el 100%. El usuario puede activar además un aviso por email.

### 4.4 Módulo 3: Tarjetas de crédito

- Un usuario puede tener **varias tarjetas**. Cada una tiene día de cierre y día de vencimiento.
- Registrar compras con tarjeta eligiendo, **en cada compra**, una de estas modalidades:
  - *Por cuota:* cada cuota se registra como gasto en su mes. Una compra de $60.000 en 6 cuotas genera 6 movimientos de $10.000.
  - *Compra completa:* el total queda en el mes de compra y las cuotas futuras se muestran como proyección, sin afectar el mes actual.
- Ver el **resumen de cada tarjeta** por período (desde el día posterior al cierre anterior hasta el cierre actual) con su vencimiento.
- Registrar el **pago del resumen** como movimiento de tipo *pago de tarjeta* en el módulo 1.

### 4.5 Módulo 4: Ahorros y metas

- Crear metas con nombre, monto objetivo y fecha límite opcional. Una meta puede ser **personal** o **del grupo familiar**.
- Registrar **aportes** a una meta de dos formas:
  - *Manual:* se carga el aporte directamente en la meta.
  - *Asociado a un movimiento:* al registrar un ingreso o gasto, se elige una meta. Ese movimiento genera un aporte (o retiro, si es un gasto) asociado.
- Ver progreso de cada meta: monto acumulado, porcentaje y monto restante.

### 4.6 Categorías

- La app trae una **lista base** de categorías (alimentos, transporte, servicios, salud, entretenimiento, etc.) que no se puede editar.
- Cada usuario puede **crear, editar y eliminar sus propias categorías**. No puede eliminar una categoría que tenga movimientos asociados; en ese caso se puede archivar.

### 4.7 Grupo familiar

- Crear un grupo. El creador queda como administrador.
- Sumar miembros de dos formas:
  - **Invitación por email:** el administrador envía una invitación. La persona acepta con su cuenta.
  - **Código de grupo:** el administrador comparte un código que el miembro ingresa desde su cuenta. El código se puede regenerar para invalidar el anterior.
- Un usuario puede pertenecer a **varios grupos**. Cada grupo tiene sus propios gastos compartidos, saldos y pagos.
- Gastos compartidos: ver sección 5.
- **Saldos:** la app calcula cuánto le corresponde pagar o cobrar a cada miembro.
- **Pagos entre miembros:** se pueden registrar pagos para saldar deudas. Cada pago queda anotado con deudor, acreedor, monto y fecha.

### 4.8 Estadísticas y gráficos

- **Resumen mensual:** ingresos, gastos, ahorro neto (ingresos menos gastos), gasto por categoría, estado de presupuestos y aportes a metas del mes.
- **Gráficos históricos:**
  - Evolución de ingresos y gastos mes a mes.
  - Gasto por categoría en el tiempo.
  - Progreso de metas a lo largo del tiempo.
  - Saldos del grupo a lo largo del tiempo.
- Filtro por rango de meses.

## 5. Reglas de negocio

### 5.1 Gastos compartidos

- Un movimiento de alcance *compartido* tiene un **pagador** (quien lo pagó) y **participantes** (miembros del grupo que comparten el gasto).
- Por defecto, el monto se reparte en **partes iguales** entre los participantes.
- Se puede **personalizar** el reparto en cada gasto, con montos exactos. La suma de las partes debe ser igual al total.

### 5.2 Saldos

- Saldo de un miembro = (lo que pagó en gastos compartidos) − (su parte en esos gastos) + (pagos realizados) − (pagos recibidos).
- Ejemplo: A pagó $100 de un gasto compartido con B, y B debe $50. Saldo A = 100 − 50 = +50; saldo B = −50. Si B paga $50 a A, saldo B = −50 + 50 = 0 y saldo A = 50 − 50 = 0.
- *Corrección:* la versión anterior de esta fórmula tenía los signos de los pagos invertidos. Se corrigió al revisar el plan de implementación.
- Saldo positivo: le deben dinero. Saldo negativo: debe dinero.
- La suma de los saldos de todos los miembros siempre es cero. Esto se usa como control de integridad.
- Los saldos se **calculan por grupo** y **a partir de los movimientos**. No se guardan como valor fijo.

### 5.3 Cuotas

- La modalidad se elige en cada compra (ver 4.4).
- Al editar una compra en cuotas se recalculan sus cuotas, sin modificar los meses ya cerrados. (Ver sección 12, punto 4.)

### 5.4 Presupuestos

- El consumo de un presupuesto se calcula según su regla (ver 4.3).
- Los presupuestos son mensuales. Un mes sin presupuesto cargado no tiene límite.

### 5.5 Montos

- Todos los montos se guardan como **decimal con 2 decimales**. No se usan números de punto flotante.
- Los montos son siempre positivos. El tipo del movimiento (ingreso, gasto, pago) define su signo en los cálculos.

### 5.6 Fechas y zona horaria

- Las fechas de corte de tarjeta se interpretan en la zona horaria **America/Argentina/Buenos_Aires**.

## 6. Requisitos no funcionales

- **Responsive:** funciona bien en celular, tablet y escritorio. Sin scroll horizontal en pantallas de 375 px de ancho.
- **Seguridad:** contraseñas con hash (bcrypt o argon2). Tokens de sesión seguros. Validación de todas las entradas. Un usuario nunca accede a datos de otro usuario o de otro grupo.
- **Integridad:** los pagos y las particiones de gastos se guardan dentro de transacciones de base de datos.
- **Rendimiento:** las listas se paginan. Los gráficos cargan en menos de 2 segundos con un año de datos.
- **Accesibilidad:** contraste suficiente, navegación por teclado y textos alternativos en gráficos.
- **Idioma:** español (Argentina). Formato de moneda y fechas locales.

## 7. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 + Vue Router + Pinia |
| Gráficos | Chart.js con vue-chartjs |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL |
| ORM | Sequelize (con migraciones) |
| Autenticación | Email y contraseña, y Google (OAuth 2.0) |

Las tecnologías de soporte (validación, pruebas, herramienta de build, etc.) están en la sección 12.

## 8. Arquitectura

### 8.1 Vista general

```
┌──────────────────────────┐        HTTPS / JSON        ┌─────────────────────────────┐
│  Frontend (Vue 3 SPA)    │  ───────────────────────►  │  Backend (Node + Express)   │
│  - Vistas responsive     │                            │  - Rutas REST /api          │
│  - Pinia (estado)        │  ◄───────────────────────  │  - Controladores            │
│  - Chart.js (gráficos)   │                            │  - Servicios de negocio     │
└──────────────────────────┘                            │  - Autenticación            │
                                                        └──────────────┬──────────────┘
                                                                       │ Sequelize
                                                        ┌──────────────▼──────────────┐
                                                        │  PostgreSQL                 │
                                                        └─────────────────────────────┘
                                        Google OAuth ◄──► Backend (login con Google)
```

### 8.2 Estructura del backend

Se organiza por **módulos de dominio**. Cada uno tiene rutas, controlador, servicio, modelos y validaciones.

```
backend/
  src/
    config/          configuración (BD, variables de entorno, CORS)
    db/
      models/        modelos Sequelize
      migrations/    migraciones
      seeders/       categorías base
    modules/
      auth/          registro, login, Google, recuperación de contraseña
      usuarios/      perfil
      grupos/        grupo familiar, invitaciones, código, miembros
      movimientos/   módulo 1: ingresos y gastos, particiones
      presupuestos/  módulo 2
      tarjetas/      módulo 3: tarjetas, cuotas, resúmenes, pagos
      metas/         módulo 4: metas y aportes
      categorias/    lista base y categorías personalizadas
      saldos/        cálculo de saldos y pagos entre miembros
      estadisticas/  resúmenes mensuales y datos históricos
    middlewares/     autenticación, validación, manejo de errores
    utils/           fechas, dinero, paginación
  tests/
```

Regla de capas: **rutas → controlador → servicio → modelo**. Los controladores no contienen lógica de negocio. Los cálculos de saldos, cuotas, presupuestos y estadísticas viven en servicios puros, para poder probarlos sin base de datos.

### 8.3 Estructura del frontend

```
frontend/
  src/
    router/          rutas y guardas de sesión
    stores/          Pinia: sesión, movimientos, presupuestos, tarjetas, metas, grupo
    services/        cliente HTTP (una función por endpoint)
    views/           pantallas, una por ruta
    components/      componentes reutilizables (tablas, formularios, tarjetas de resumen)
    charts/          componentes de gráficos (uno por tipo)
    composables/     lógica reutilizable (formato de moneda, fechas, paginación)
    styles/          tokens de color, tipografía y espaciado
```

### 8.4 Módulos del frontend y del backend

Los cuatro módulos funcionales tienen un módulo equivalente en cada capa. Así cada uno se entiende y se prueba por separado.

| Módulo | Backend | Frontend (vistas) |
|---|---|---|
| Ingresos y gastos | `movimientos` | `/movimientos` |
| Presupuestos | `presupuestos` | `/presupuestos` |
| Tarjetas | `tarjetas` | `/tarjetas` |
| Ahorros y metas | `metas` | `/metas` |
| Grupos familiares | `grupos`, `saldos` | `/grupos`, `/grupos/:id` |
| Estadísticas | `estadisticas` | `/estadisticas` |

### 8.5 Autenticación

- Se usa un **token de acceso** de corta duración y un **token de refresco** de larga duración. Ambos se guardan en cookies httpOnly.
- El login con Google usa OAuth 2.0. El backend valida el token de Google, busca o crea el usuario y emite sus propios tokens.
- Las rutas protegidas pasan por un middleware que valida el token y carga el usuario.

## 9. Modelo de datos

Todas las tablas tienen `id` (UUID), `creado_en` y `actualizado_en`.

| Entidad | Campos principales | Relaciones |
|---|---|---|
| **Usuario** | nombre, email (único), contraseña_hash (nullable), google_id (nullable) | — |
| **Grupo** | nombre, código (único), creado_por | Usuario (creador) |
| **MiembroGrupo** | grupo_id, usuario_id, rol (`admin` / `miembro`) | Grupo, Usuario. Único por (grupo, usuario) |
| **Invitacion** | grupo_id, email, token (único), estado (`pendiente` / `aceptada` / `cancelada` / `expirada`), expira_en | Grupo |
| **Categoria** | nombre, usuario_id (nullable: null = base), archivada | Usuario |
| **Tarjeta** | usuario_id, nombre, dia_cierre, dia_vencimiento | Usuario |
| **Movimiento** | usuario_id (quien lo carga), tipo (`ingreso` / `gasto` / `pago_tarjeta`), alcance (`personal` / `compartido`), monto, fecha, descripcion, categoria_id, tarjeta_id (nullable), compra_id (nullable), meta_id (nullable), grupo_id (nullable), pagador_id (nullable, solo compartidos) | Usuario, Categoria, Tarjeta, Meta, Grupo |
| **Compra** | usuario_id, tarjeta_id, monto_total, cuotas, modalidad (`por_cuota` / `compra_completa`), fecha | Tarjeta, Movimiento |
| **ParticipacionGasto** | movimiento_id, usuario_id, monto. La suma de montos = monto del movimiento | Movimiento, Usuario |
| **Presupuesto** | usuario_id, categoria_id, mes (AAAA-MM), monto_limite, regla (`solo_personal` / `con_compartidos`). Único por (usuario, categoría, mes) | Usuario, Categoria |
| **Meta** | usuario_id (creador), grupo_id (nullable: null = personal), nombre, monto_objetivo, fecha_limite (nullable) | Usuario, Grupo |
| **AporteMeta** | meta_id, monto (negativo si es retiro), fecha, movimiento_id (nullable) | Meta, Movimiento |
| **PagoEntreMiembros** | grupo_id, deudor_id, acreedor_id, monto, fecha, nota | Grupo, Usuario |

Notas:

- `Movimiento` de tipo `pago_tarjeta` lleva `tarjeta_id` y no tiene categoría.
- Los saldos y los totales de estadísticas **no se almacenan**. Se calculan con consultas o servicios.
- Un `Movimiento` de alcance *compartido* siempre tiene `grupo_id` y `pagador_id`.

## 10. Endpoints principales

Prefijo: `/api`. Todos devuelven JSON y usan códigos HTTP estándar.

| Área | Método y ruta | Descripción |
|---|---|---|
| Auth | `POST /auth/registro`, `POST /auth/login`, `POST /auth/google`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/recuperar` | Cuenta y sesión |
| Usuario | `GET /usuario/perfil`, `PATCH /usuario/perfil` | Perfil |
| Categorías | `GET /categorias`, `POST /categorias`, `PATCH /categorias/:id`, `DELETE /categorias/:id` | Lista base y propias |
| Movimientos | `GET /movimientos?mes=&categoria=&tipo=&alcance=`, `POST /movimientos`, `PATCH /movimientos/:id`, `DELETE /movimientos/:id` | Módulo 1 |
| Presupuestos | `GET /presupuestos?mes=`, `PUT /presupuestos` (crear o actualizar por categoría y mes), `DELETE /presupuestos/:id`, `GET /presupuestos/estado?mes=` | Módulo 2 |
| Tarjetas | `GET /tarjetas`, `POST /tarjetas`, `PATCH /tarjetas/:id`, `DELETE /tarjetas/:id`, `POST /tarjetas/:id/compras`, `GET /tarjetas/:id/resumen?periodo=` | Módulo 3 |
| Metas | `GET /metas`, `POST /metas`, `PATCH /metas/:id`, `DELETE /metas/:id`, `POST /metas/:id/aportes` | Módulo 4 |
| Grupo | `POST /grupos`, `GET /grupos`, `POST /grupos/:id/invitaciones`, `POST /grupos/unirse` (con código), `POST /grupos/:id/codigo/regenerar`, `DELETE /grupos/:id/miembros/:usuarioId`, `POST /grupos/:id/salir` | Grupo familiar |
| Saldos | `GET /grupos/:id/saldos`, `POST /grupos/:id/pagos`, `GET /grupos/:id/pagos` | Saldos y pagos entre miembros |
| Estadísticas | `GET /estadisticas/mensual?mes=`, `GET /estadisticas/historico?desde=&hasta=` | Resúmenes y gráficos |

## 11. Flujos principales

### 11.1 Registrar una compra en cuotas

1. El usuario elige la tarjeta, el monto total, la cantidad de cuotas y la modalidad.
2. El servicio crea una `Compra`.
3. Si la modalidad es `por_cuota`, se generan N movimientos, uno por mes, a partir del mes de compra (o del mes de cierre, según la regla de la tarjeta; ver punto 2 de sección 12).
4. Si la modalidad es `compra_completa`, se genera un movimiento por el total en el mes de compra. Las cuotas futuras se calculan en la consulta de resumen, sin crear movimientos.
5. Todo se guarda en una transacción.

### 11.2 Registrar un gasto compartido

1. El usuario elige alcance *compartido*, el pagador y los participantes.
2. El reparto es igual por defecto. Puede editarse con montos exactos.
3. Se valida que la suma de las partes sea igual al monto total.
4. Se guardan el movimiento y sus participaciones en una transacción.

### 11.3 Saldar una deuda

1. El deudor (o cualquier miembro) registra un pago a otro miembro del grupo.
2. El saldo de ambos se recalcula a partir de los movimientos y pagos.
3. La suma de saldos del grupo debe seguir siendo cero. Si no lo es, se registra un error interno.

### 11.4 Invitar a un miembro

- **Por email:** el administrador envía la invitación. La persona hace clic en el enlace, inicia sesión o se registra, y acepta.
- **Por código:** el miembro ingresa el código en su cuenta. Si el código fue regenerado, se rechaza.

## 12. Decisiones pendientes de confirmación

Estado tras la revisión del usuario: los puntos 1 a 11 quedaron confirmados y ya están reflejados en las secciones anteriores. Todos los puntos quedaron confirmados.

1. **Metas:** confirmado: pueden ser personales o del grupo familiar.
2. **Cuotas por mes y día de cierre:** ¿la cuota cae en el mes de la compra o en el mes del próximo cierre? Propuesta: en el período de resumen al que pertenece la compra según su fecha y el día de cierre.
3. **Administrador del grupo:** ¿puede quitar miembros? ¿Puede salir del grupo sin dejar el grupo sin administrador? Propuesta: sí puede quitar miembros, y si es el último administrador, debe designar otro antes de salir.
4. **Editar compras en cuotas:** ¿qué pasa si se cambia el monto o la cantidad de cuotas? Propuesta: se recalculan solo las cuotas futuras.
5. **Alertas de presupuesto y vencimientos:** ¿se avisa dentro de la app, por email, o ambos? Propuesta: dentro de la app.
6. **Autenticación técnica:** tokens en cookies httpOnly (propuesto en 8.5). Confirmar.
7. **Pruebas y herramientas de build:** propuesta: Jest y Supertest en backend; Vitest en frontend; Vite como herramienta de build del frontend; express-validator para validación; ESLint y Prettier.
8. **Despliegue:** no definido. Queda fuera de esta fase.
9. **Umbrales de alerta de presupuesto:** 80% y 100% son una propuesta.
10. **Recuperación de contraseña y edición de perfil:** se incluyeron como propuesta; no fueron pedidos explícitamente.
11. **Vinculación de cuentas:** cuando el email de Google coincide con una cuenta existente, la propuesta es vincularlas.
12. **Cantidad de grupos por usuario:** confirmado: varios grupos, cada uno con sus gastos compartidos y saldos propios.
13. **Definición de "ahorro neto"** en el resumen mensual: confirmado: ingresos menos gastos. Los aportes a metas no se descuentan.
14. **Presupuestos con compartidos y varios grupos:** confirmado: suman la parte de los gastos compartidos de **todos** los grupos del usuario.

## 13. Pruebas

- **Unitarias (servicios puros):** cálculo de cuotas, resúmenes de tarjeta, reparto de gastos, saldos (incluyendo que la suma sea cero), consumo de presupuestos.
- **Integración (API + base de datos de prueba):** flujos de la sección 11, permisos entre usuarios y grupos, transacciones.
- **Frontend:** pruebas de componentes críticos (formularios de movimientos, gráficos) y pruebas de diseño responsive en 375 px, 768 px y 1280 px.
- **Casos borde a cubrir:** cuota en el día de cierre, mes de 28 o 31 días, reparto con centavos, saldo que queda en cero, código de grupo regenerado.

## 14. Próximos pasos

1. El usuario revisa este documento y confirma o corrige la sección 12.
2. Una vez aprobado, se redacta el plan de implementación por fases:
   - Fase 1: base del proyecto, autenticación, categorías.
   - Fase 2: módulo 1 (movimientos) y módulo 2 (presupuestos).
   - Fase 3: módulo 3 (tarjetas y cuotas) y módulo 4 (metas).
   - Fase 4: grupo familiar, saldos y pagos.
   - Fase 5: estadísticas y gráficos.
   - Fase 6: pulido responsive, accesibilidad y pruebas finales.
