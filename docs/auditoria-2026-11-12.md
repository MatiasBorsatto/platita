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
| P-03 | Baja | En la base compartida quedó la categoría base **"Base test 1793146394584"** de una corrida de pruebas interrumpida el 28/10. Todos los usuarios la ven en los selectores de categoría. | Abierto: borrarla requiere confirmación |
| P-04 | Baja | 29 usuarios de prueba (`@example.com`) en la misma base que usa la demo. | Abierto: limpiar requiere confirmación |
| P-05 | Baja | `/api/notificaciones` se pide dos veces por cada pantalla. | Abierto |
| P-06 | Baja | Para metas en USD, el resumen mensual no informa los aportes por moneda: la tarjeta muestra 0 en USD. La serie histórica sí los informa. | Abierto |
| P-07 | Info | Las rutas del frontend no usan carga diferida. Todo va en un único JS de 166 kB gzip. | Mejora opcional |

## 5. Para el día de la presentación

1. Encender el servidor y comprobar:
   - `systemctl status finanzas-backend qualitygate-ngrok`;
   - `https://touched-woodcock-upright.ngrok-free.app/api/health` devuelve `{"estado":"ok"}`.
2. Publicar la corrección de P-02 (push a `main`, que dispara el deploy en Netlify).
3. Antes de la demo, decidir si se borran la categoría y los usuarios de prueba (P-03, P-04).
4. Plan alternativo si el servidor no está disponible: correr el backend en la PC de la presentación y apuntar el frontend local a él.

   ```bash
   cd backend && PORT=3100 node src/server.js
   ```

   ```bash
   cd frontend && API_URL=http://localhost:3100 npm run dev
   ```

   Esto se usó en esta auditoría y funciona contra la misma base.
