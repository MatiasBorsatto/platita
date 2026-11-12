# Auditoría previa a la presentación — 12/11/2026

Objetivo: validar que la aplicación funciona según lo esperado, con foco en los cambios pedidos por la profesora (control parental, tarjetas, multimoneda y velocidad).

**Dictamen:** el código funciona. Hay un bloqueo de infraestructura: el servidor está apagado o desconectado. Se encontró un bug de interfaz, que ya está corregido.

## 1. Pruebas automatizadas

| Suite | Resultado | Detalle |
|---|---|---|
| Backend (Jest + Supertest, base Neon real) | **250/250** en 34 archivos | 294 s |
| Frontend (Vitest) | **99/99** en 28 archivos | +1 prueba de regresión, sección 4 |
| Build de producción | Correcto | JS 482,8 kB (165,9 kB gzip), CSS 57,7 kB |
| `npm audit` frontend | 0 vulnerabilidades | — |

## 2. Recorrido de punta a punta por HTTP real

Backend levantado localmente contra la misma base Neon. Se usaron 3 usuarios descartables (adulto, menor y otro adulto), que se borraron al terminar.

**Resultado: 34/34 verificaciones correctas.**

| Área | Verificado |
|---|---|
| Sesión | Registro, inicio de sesión. Sin sesión responde 401 |
| Movimientos | Alta en ARS y USD. "Mi plata" separa monedas sin convertir. Monto de 11 dígitos responde 400 (D-01) |
| Tarjetas | El adulto crea un gasto fijo con tarjeta. Se rechazan el número completo, el CVV y los últimos 4 dígitos inválidos. El detalle no expone datos sensibles |
| Grupos | El código lo ve solo el administrador. Unión con código. $100 entre 3 da 33,34 + 33,33 + 33,33. Saldos y pago entre miembros |
| Control parental | Menor sin tutor: usa sus funciones personales. Con tutor y sin permiso: 403. Conceder tarjetas: 400. Permiso concedido: accede. Gasto fijo con tarjeta siendo menor: 403. El menor no cambia sus permisos: 403. Los cambios quedan en la auditoría |
| Presupuestos y metas | Alta y estado. Un movimiento en USD no suma a una meta en ARS: 400 |
| Estadísticas, deudas, notificaciones | Responden 200 |
| Aislamiento | Editar un movimiento ajeno responde 404 |

**Tiempos con el backend en esta PC (incluyen la ida y vuelta a Neon):**

| Consulta | Tiempo |
|---|---|
| Serie histórica de 24 meses | ~190 ms |
| Estado de presupuestos | ~150–195 ms |
| Resumen mensual | ~195 ms |
| Saldos del grupo | ~480 ms (la más lenta) |

## 3. Interfaz con datos reales

Se recorrieron todas las vistas en el navegador, conectadas al backend real:
- Movimientos, Presupuestos, Gastos fijos, Metas, Grupos, Estadísticas, Deudas, Control parental y Perfil.
- Todos los pedidos a la API respondieron 200 después de iniciar sesión.
- El recorrido guiado arranca solo en el primer ingreso. Perfil muestra la opción de animaciones.

## 4. Hallazgos

| ID | Severidad | Hallazgo | Estado |
|---|---|---|---|
| P-01 | **Bloqueante** | El túnel ngrok responde `ERR_NGROK_3200` (endpoint offline). El servidor `192.168.1.100` no responde desde la red local ("Host de destino inaccesible") y SSH no conecta. Sin servidor, el sitio publicado no tiene backend. | Abierto: encender el servidor y verificar |
| P-02 | Media | Estadísticas mostraba **"NaN"** en "Aportes a metas" con datos reales. El resumen mensual de la API trae `aportesMetas` en el primer nivel y no dentro de `porMoneda`. La prueba existente no lo detectó porque su dato simulado sí lo traía. | **Corregido** en `EstadisticasView.vue`, con prueba de regresión. Falta publicarlo |
| P-03 | Baja | En la base compartida quedó la categoría base **"Base test 1793146394584"** de una corrida de pruebas interrumpida el 28/10. Todos los usuarios la ven en los selectores de categoría. | **Resuelto** (12/11): borrada con confirmación del equipo |
| P-04 | Baja | 29 usuarios de prueba (`@example.com`) en la misma base que usa la demo. | **Resuelto** (12/11): borrados los 29 usuarios y sus 7 grupos de prueba |
| P-05 | Baja | `/api/notificaciones` se pide dos veces por cada pantalla. | Abierto |
| P-06 | Baja | Para metas en USD, el resumen mensual no informa los aportes por moneda: la tarjeta muestra 0 en USD. La serie histórica sí los informa. | Abierto |
| P-07 | Info | Las rutas del frontend no usan carga diferida. Todo va en un único JS de 166 kB gzip. | Mejora opcional |

## 5. Para el día de la presentación

1. Encender el servidor y comprobar:
   - `systemctl status finanzas-backend qualitygate-ngrok`;
   - `https://touched-woodcock-upright.ngrok-free.app/api/health` devuelve `{"estado":"ok"}`.
2. Publicar la corrección de P-02 (push a `main`, que dispara el deploy en Netlify).
3. Datos de demostración: la familia Pérez, con seis meses de uso, se carga con `ENTORNO_DEMO=true node scripts/demo-seed.js --reiniciar`, desde `backend`.
4. Plan alternativo si el servidor no está disponible: correr el backend en la PC de la presentación y apuntar el frontend local a él.

   ```bash
   cd backend && PORT=3100 node src/server.js
   ```

   ```bash
   cd frontend && API_URL=http://localhost:3100 npm run dev
   ```

   Esto se usó en esta auditoría y funciona contra la misma base.

---

# Segunda pasada: QA estricto y correcciones — 12/11/2026

Pedido: verificar cada elemento y comportamiento antes de la presentación, corregir lo que se encuentre y crear lo que falte. Se cerraron los hallazgos abiertos de la auditoría del 10/11 y los nuevos que aparecieron en esta pasada. Cada corrección tiene su prueba automatizada.

## A. Hallazgos corregidos

| ID | Qué pasaba | Corrección | Prueba |
|---|---|---|---|
| M-01 | Consultar el estado de los presupuestos (un GET) escribía las alertas en la base, al revés de lo que dice el informe (CQS). | La consulta quedó de solo lectura. Las alertas se generan después de crear o editar un gasto personal o compartido, pagar una cuota o definir un tope. | `presupuestos.test.js` (3 casos nuevos) |
| M-02 | Generar cuotas hacía un `findOrCreate` por mes y por concepto; Deudas calculaba el permiso una vez por cuota. `/gastos-fijos/recordatorios` tardaba 1,57 s. | Una lectura de los meses existentes y una sola inserción; permiso calculado una vez por grupo; avisos ya registrados leídos de una vez. Ahora tarda 0,50 s (−68 %). | `gastos-fijos.test.js`, `deudas.test.js` |
| M-03 | Dos pagos simultáneos de la misma cuota creaban dos movimientos. | La cuota se marca como pagada solo si sigue pendiente, en la misma transacción. | Pago doble simultáneo: un 200 y un 400, un solo movimiento |
| M-04 | Editar el total de un concepto en cuotas repartía el total nuevo sin descontar lo pagado (600 − 100 pagado daba 200 + 200 = 500). Cambiar el mes de inicio no regeneraba cuotas. | Lo que falta se reparte en las cuotas futuras (250 + 250). Cambiar el mes de inicio rehace el calendario; con cuotas pagadas se rechaza. | `gastos-fijos.test.js` |
| M-05 | El formulario de movimientos ofrecía metas ajenas. | Ya corregido antes: solo metas propias y de la misma moneda. | `FormularioMovimiento.test.js` |
| M-07 | El gráfico de saldos del grupo de la spec no existía en la interfaz y el cálculo mezclaba monedas. | Nueva ruta `GET /grupos/:id/saldos/historico` (por moneda, con nombres). El gráfico aparece en el detalle del grupo y se descarga solo si hay movimientos. | `historico.test.js` |
| M-08 | Al salir del grupo, los vínculos tutor-menor seguían vigentes. | Salir o ser quitado elimina los vínculos del grupo y lo registra en la actividad del tutor. Además, `puede()` ignora vínculos de grupos de los que el menor ya no es miembro. | `control-parental.test.js` (2 casos) |
| M-09 | Con la sesión vencida la app mostraba errores en lugar de llevar al login. | Lleva al login con el aviso "Tu sesión venció" y, al volver a entrar, regresa a la pantalla donde estaba. Sin fecha de nacimiento, lleva a cargarla. | `http.test.js` (3 casos) y verificado en el navegador |
| M-10 | La contraseña de las cuentas de demostración estaba en el repositorio. | Se lee de `DEMO_CLAVE` en `backend/.env` (no versionado). Se cambió por una nueva. | El script se niega a correr sin ella |
| B-02 | Los aportes a un gasto compartido no tenían tope. | No pueden superar el monto del gasto. | `aportes-gastos-compartidos.test.js` |
| B-03 | Un miembro con saldo pendiente podía salir del grupo. | Salir o ser quitado exige saldo cero. | `grupos.test.js` |
| B-04 | La edad del panel de control parental se calculaba distinto que la clasificación. | Misma cuenta exacta en los dos lugares. | `control-parental.test.js` |
| B-06 | Sin `DATABASE_URL` el servidor arrancaba y fallaba en la primera consulta. | No arranca sin `DATABASE_URL` ni `JWT_SECRET`. | — |
| B-07 | La URL de la base en `backend/.env` terminaba en una comilla suelta, y `sslmode=require` producía un aviso de seguridad en cada ejecución. | Comilla quitada y `sslmode=verify-full` (el mismo comportamiento, sin aviso), también en `.env.example` e `instalacion.md`. | Conexión verificada |
| B-08 | Crear un gasto fijo con varios conceptos no era atómico. | Gasto y conceptos en una sola transacción. | `gastos-fijos.test.js` |
| B-09 / P-06 | El resumen mensual no desglosaba los aportes a metas por moneda. | Cada moneda trae sus aportes, igual que la serie histórica. | `resumen-mensual.test.js` |
| P-05 | Cada pantalla pedía las notificaciones dos veces. | La campana tenía dos `onMounted`; quedó uno. | `CampanaNotificaciones.test.js` |
| P-07 | Toda la app se descargaba de una vez (176 kB gzip). | Carga diferida por módulo: la primera visita baja a 93,6 kB (−47 %). Estadísticas, con Chart.js, se descarga al abrirla. | Build |
| Q-01 (nuevo) | El aviso de cuota vencida mostraba el monto sin formato: "($450000.00)". | Formato argentino en los avisos: "$ 450.000,00" o "US$ 1.250,00". | `utils/dinero.test.js` |
| Q-02 (nuevo) | La actividad del control parental mostraba códigos internos ("vinculo.creado:"). | Texto legible con fecha para cada acción. | `controlParental.test.js` |

## B. Decisiones documentadas (no se cambian)

- **B-05:** las categorías propias se archivan en lugar de borrarse, aunque no tengan movimientos. Así nunca se pierde la categoría de un movimiento histórico ni de un presupuesto.
- **M-06:** un gasto fijo de grupo lo administra quien lo creó; el resto de los integrantes lo ve en Deudas. Habilitar la edición a todos los adultos cambia el modelo de permisos y no es seguro hacerlo antes de presentar.
- **Paginación de metas y gastos fijos:** se corta en memoria. Son listas por usuario y cortas; no justifica el riesgo de cambiarlo ahora.
- **Recordatorios de vencimiento:** las cuotas se generan cuando el usuario abre la app (no hay un proceso programado). Es la forma de no depender de un servidor siempre encendido.

## C. Verificaciones en el navegador (datos reales de la familia Pérez)

| Verificación | Resultado |
|---|---|
| Alta de movimiento con doble clic | Se guarda una vez; el monto se ve como "30.000" mientras se escribe |
| Edición y borrado con diálogo de confirmación | Correcto; el foco arranca en "Cancelar" |
| Pagar el alquiler vencido desde "Tenemos que pagar" | Sale de la lista y aparece en Movimientos como gasto de Gastos fijos |
| Campana | Avisos de presupuesto (80 % y superado) y de vencimientos, con montos formateados |
| Gráfico de saldos del grupo | Se muestra con los nombres de cada integrante |
| Control parental | Los interruptores se aplican al instante; los de tarjetas están deshabilitados; la actividad se lee con fecha |
| Sesión vencida | Lleva al login con aviso y vuelve a la pantalla anterior |
| Cuenta de Tomi (13) | Usa sus módulos; en Presupuestos, Gastos fijos y Estadísticas ve "No tenés permiso" |
| Recorrido guiado | Los 16 pasos encuentran su elemento y cambian de módulo sin errores |
| Diseño a 375 px y a 768 px | 0 px de desborde horizontal en las 12 vistas |

## D. Resultado final de las suites

- Backend (Jest + Supertest, base Neon real): **263/263** en 34 archivos.
- Frontend (Vitest): **105/105** en 28 archivos.
- Build de producción correcto; `npm audit` del frontend sin vulnerabilidades.

## E. Velocidad medida (backend local contra Neon)

| Pedido | Antes | Ahora |
|---|---|---|
| `/gastos-fijos/recordatorios` | 1,57 s | 0,50 s |
| `/deudas` | — | 0,18 s |
| `/estadisticas/historico` (12 meses) | — | 0,42 s |
| Primera carga del frontend (gzip) | 176 kB | 93,6 kB |
