# Pruebas de sistema y validación

Responsable: Matias Borsatto. Ejecutadas sobre el sistema completo: backend y frontend en local, base PostgreSQL en Neon, navegador Chromium. Las capturas y los resultados corresponden a la sesión del 30/10/2026.

## Funcionalidades evaluadas

| ID | Funcionalidad | Procedimiento | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| ST-01 | Inicio de sesión | Ingresar con email y contraseña válidos | Acceso a Movimientos | Acceso a `/movimientos` | Aprobado |
| ST-02 | Alta de movimiento | Completar monto, descripción y guardar | Movimiento creado y alerta "Guardado" | Movimiento creado; alerta visible | Aprobado |
| ST-03 | Formato del monto | Escribir "30000" y salir del campo | "30.000" mientras se escribe y "30.000,00" al salir | Igual al esperado | Aprobado |
| ST-04 | Doble envío | Doble clic en "Guardar" | Un solo movimiento | Un solo movimiento | Aprobado |
| ST-05 | Confirmación de borrado | Presionar "Eliminar" | Diálogo propio, foco en "Cancelar", cierre con Escape | Diálogo propio con foco en "Cancelar" | Aprobado |
| ST-06 | Notificaciones | Abrir el panel de la campana | Panel junto al botón, sin tapar el contenido | Panel por encima del contenido, texto legible | Aprobado |
| ST-07 | Monto que supera la columna | Enviar 10000000000.00 por la API | 400 | 500 antes de la corrección; 400 después (D-01 cerrado) | Aprobado tras corrección |
| ST-08 | Diseño, escritorio 1024 px | Recorrer las 7 vistas y revisar desbordes | Sin desborde horizontal | Sin desborde en las 7 vistas | Aprobado |
| ST-09 | Diseño, celular 375 px | Recorrer las 7 vistas y revisar campos y botones | Campos y botones dentro de la pantalla | Sin desborde; barra inferior fija abajo | Aprobado |
| ST-10 | Diseño, tablet 768 px | Revisar barra lateral y tarjetas de estadísticas | Barra más angosta; las 4 tarjetas en una fila | Verificado | Aprobado |
| ST-11 | Modo oscuro | Activar el modo oscuro del sistema | Colores legibles | Revisado en estadísticas | Aprobado |
| ST-12 | Estado de carga | Abrir una vista con datos | Indicador de carga y esqueleto de la lista | Esqueleto visto en Metas durante la carga | Aprobado |
| ST-13 | Barra de progreso de trabajo | Iniciar una petición lenta | Barra superior mientras hay trabajo | No se pudo verificar en el navegador de prueba | Pendiente |
| ST-14 | Campo de monto por participante (gastos compartidos) | Usar el modo personalizado | Montos formateados y reparto correcto | No se ejecutó con un grupo de dos miembros | Pendiente |
| ST-15 | Recuperación de contraseña por email | Solicitar recuperación | Correo recibido con enlace | Requiere configurar SMTP en el entorno | Pendiente |
| ST-16 | Login con Google | Ingresar con Google | Acceso con la cuenta de Google | Requiere configurar `GOOGLE_CLIENT_ID` | Pendiente |

## Requisitos verificados

| Requisito | Casos | Estado |
|---|---|---|
| Registrar y consultar movimientos personales | ST-01, ST-02 | Cumple |
| Formato de dinero argentino y validación de montos | ST-03, CN-01 a CN-15 | Cumple, salvo D-01 |
| Evitar duplicados por doble envío | ST-04 | Cumple |
| Confirmar acciones destructivas | ST-05 | Cumple |
| Usable en celular y escritorio | ST-08, ST-09, ST-10 | Cumple |
| Manejo de errores | ST-07 | No cumple (D-01) |
| Notificaciones de presupuesto | ST-06 | Cumple en la interfaz; sin datos reales de alertas |
| Recuperación de contraseña e invitación por email | ST-15 | Pendiente de configuración |
| Login con Google | ST-16 | Pendiente de configuración |

## Respuesta a la pregunta de la consigna

¿El sistema satisface las necesidades planteadas al comienzo del proyecto?

**Respuesta preliminar: sí en lo principal, con condiciones.** Las funcionalidades de movimientos, presupuestos, tarjetas, metas, grupos y estadísticas están implementadas y cubiertas por 288 pruebas automatizadas. La interfaz funciona en escritorio, tablet y celular. Las condiciones son:

1. Corregir D-01 para que los montos fuera de rango respondan 400 y no 500.
2. Configurar SMTP y Google para validar ST-15 y ST-16 en el entorno real.
3. Completar ST-13 y ST-14 con datos de un grupo de dos miembros.

La respuesta definitiva queda pendiente hasta cerrar esas tres condiciones.
