# Informe técnico final: Platita

## 1. Portada

**Platita: control de finanzas personales y familiares**
Materia: Verificación y Validación de software
Curso: Tercer Año "TSDS", Universidad Provincial de Córdoba, Sede Regional Las Varillas
Fecha: 30/10/2026

## 2. Integrantes

- Matias Borsatto (MatiasBorsatto en GitHub)
- Tomas Agustin Gudiño Rubiolo

## 3. Descripción del problema

Muchas familias no saben en qué gastan, cuánto les queda de presupuesto ni cuánto debe cada integrante a otro cuando comparten gastos. Las planillas son difíciles de mantener y no separan lo personal de lo compartido. El problema es la falta de una herramienta única para registrar ingresos y gastos, controlar presupuestos y tarjetas, ahorrar para metas y repartir gastos del grupo familiar.

## 4. Objetivos

- Permitir registrar ingresos y gastos personales y compartidos.
- Controlar presupuestos mensuales con alertas al 80 % y al 100 %.
- Gestionar tarjetas de crédito con cuotas y pagos de resumen.
- Seguir metas de ahorro, personales o de grupo.
- Calcular saldos entre miembros del grupo y registrar pagos.
- Mostrar estadísticas mensuales e históricas.
- Funcionar en escritorio y en celular.

## 5. Requisitos

Los requisitos completos están en `docs/superpowers/specs/2026-10-27-finanzas-jaki-design.md`. Resumen de los principales:

- **Funcionales:** registro e inicio de sesión con email y Google; movimientos; presupuestos; tarjetas; metas; grupos e invitaciones; gastos compartidos con reparto igual o personalizado; saldos y pagos; estadísticas.
- **No funcionales:** montos con exactitud de centavos; datos de cada usuario aislados; interfaz responsive; contraseñas con hash; conexión a la base con TLS.

## 6. Descripción del sistema

Aplicación web de tres capas:

- **Frontend:** Vue 3, Vue Router, Pinia, Chart.js y Motion. Se despliega en Netlify.
- **Backend:** Node.js con Express 5 y Sequelize. Expone una API REST bajo `/api`.
- **Base de datos:** PostgreSQL en Neon, con 12 migraciones.

Módulos: movimientos, presupuestos, tarjetas, metas, grupos, estadísticas y perfil.

## 7. Tecnologías utilizadas

| Capa | Tecnología | Uso |
|---|---|---|
| Interfaz | Vue 3, Vite, Pinia, Vue Router | Aplicación de una sola página |
| Gráficos | Chart.js | Estadísticas |
| Animación | Motion 14.3 | Transiciones, indicadores y fondo |
| Backend | Node.js, Express 5 | API |
| ORM | Sequelize 6 | Acceso a PostgreSQL |
| Base | PostgreSQL (Neon) | Datos |
| Autenticación | JWT en cookies httpOnly, bcryptjs, Google | Sesión |
| Pruebas | Jest 30, Supertest, Vitest 4, Vue Test Utils | Automatización |
| Despliegue | Netlify (frontend), Render (backend) | Publicación |
| Control de versiones | Git y GitHub | Repositorio |

## 8. Planificación

El proyecto se planificó en 29 tareas agrupadas en seis fases, con revisión de cada tarea antes de avanzar. El plan está en `docs/superpowers/plans/2026-10-27-finanzas-jaki.md`. La división de la actividad integradora fue: Matias, casos de prueba, registro de defectos y pruebas de sistema; Tomas, automatización, revisión de un artefacto no código e informe técnico.

## 9. Desarrollo

El desarrollo se hizo por tareas, en la rama `feature/finanzas-jaki`, y luego se integró en `main`. Cada tarea tuvo un reporte de implementación y una revisión de especificación y de calidad. Después de la base llegaron funcionalidades como gastos compartidos editables, perfil con preferencia de email, y una tanda de correcciones de seguridad y de interfaz.

El historial completo está en GitHub: https://github.com/MatiasBorsatto/finanzas-jaki

## 10. Estrategia de verificación y validación

- **Verificación** (¿se construye bien?): revisión de cada tarea contra la especificación y revisión de calidad, más la documentación de la especificación y el plan.
- **Validación** (¿se construye lo correcto?): pruebas de sistema sobre las funcionalidades principales, con el navegador y la API, en escritorio, tablet y celular.
- **Niveles:** unitarias (lógica de dinero, fechas y saldos), integración (API con base real), componentes (interfaz) y sistema (flujo completo a mano).

## 11. Casos de prueba

Los casos están en `01-casos-de-prueba.md`: 23 casos con los campos de la consigna. Cubren caja negra (clases de equivalencia, valores límite y datos inválidos) y caja blanca (instrucciones, decisiones, condiciones y caminos).

## 12. Pruebas de caja negra

Se aplicaron clases de equivalencia y valores límite a `validarMonto`, `sumar`, `dividirEnPartes` y al campo de monto. Por ejemplo, el monto mínimo válido es 0.01, el cero se rechaza, y el máximo es 9999999999.99. Resultados en `02-ejecucion.md`.

## 13. Pruebas de caja blanca

Se analizaron `validarMonto`, `calcularSaldos` y `mesDeCuota`/`periodoResumen`. Para cada una se listaron las decisiones, las condiciones y los caminos, y se verificó que cada camino tuviera un caso. El análisis de `validarMonto` encontró el defecto D-01.

## 14. Pruebas unitarias

Se automatizaron pruebas unitarias para el módulo de dinero (`dinero.test.js`), el campo de monto (`CampoMonto.test.js`), el indicador de carga (`CargandoIndicador.test.js`) y el movimiento de interfaz (`movimiento.test.js`). Ver `05-automatizacion.md`.

## 15. Pruebas de integración

Las pruebas de integración usan la API con la base real: flujos de registro, login, creación de movimientos, cambio de contraseña, flujo completo de grupo y aislamiento entre usuarios. Ejemplo de la consigna: registro, almacenamiento y acceso posterior. Ver `05-automatizacion.md` y `monto-maximo.test.js`.

## 16. Pruebas de sistema

Se ejecutaron 16 pruebas de sistema sobre el sistema completo: funcionamiento, formato de montos, doble envío, confirmaciones, notificaciones, diseño responsive y modo oscuro. Doce se aprobaron (una de ellas, ST-07, después de corregir D-01) y cuatro quedan pendientes: recuperación por email, login con Google, barra de progreso y monto por participante. Ver `04-pruebas-sistema.md`.

## 17. Automatización

Se usaron Jest con Supertest para el backend y Vitest con Vue Test Utils para el frontend. Suite de backend: 211 pruebas aprobadas. Suite de frontend: 80 pruebas aprobadas. Ventajas y limitaciones en `05-automatizacion.md`.

## 18. TDD y refactorización

Se documenta un ciclo sobre la validación de montos y una refactorización de `calcularEstadosPresupuestos`, que separó una consulta de lectura de un registro de alertas. El documento aclara que el orden RED → GREEN no se siguió en todos los casos. Ver `07-tdd-regresion.md`.

## 19. Pruebas de regresión

Después de cada corrección se ejecutó la suite completa. La corrección de D-01 pasó de 208 a 211 pruebas, sin que ninguna prueba anterior dejara de pasar. Ver `07-tdd-regresion.md`.

## 20. Defectos encontrados

Se registraron 16 defectos durante el desarrollo y las pruebas, y los 16 están cerrados. El último, D-01, se encontró en la verificación final. Los defectos de mayor severidad fueron la verificación TLS de la base (D-02), la enumeración de cuentas en la recuperación de contraseña (D-03), el aislamiento de gastos compartidos en la lista personal (D-07) y la sesión que caía a los 15 minutos (D-14). Registro completo en `03-registro-defectos.md`.

## 21. Seguimiento de defectos

Cada defecto tiene ID, fecha, descripción, funcionalidad afectada, pasos para reproducir, resultado esperado y obtenido, evidencia, severidad, prioridad y estado. Los minors diferidos (ver `03-registro-defectos.md`) quedan documentados y no bloquean la funcionalidad principal.

## 22. Revisión de artefactos no código

El proyecto no tenía instrucciones de instalación. Se escribieron como borrador (`docs/instalacion.md`) y se revisaron contra el código. La revisión encontró cinco problemas: faltaba un archivo de ejemplo de variables, la versión de Node no estaba verificada, un PostgreSQL local sin SSL no funciona, las pruebas escriben en la base indicada y faltaba la sección de solución de problemas. Tres se corrigieron, y dos quedan parciales. Ver `06-revision-artefacto.md`.

## 23. Resultados

| Indicador | Resultado |
|---|---|
| Casos de prueba diseñados | 23 (caja negra y caja blanca) |
| Casos ejecutados a mano | 17: 16 aprobados, 1 corregido después |
| Pruebas automatizadas de backend | 211 aprobadas |
| Pruebas automatizadas de frontend | 80 aprobadas |
| Pruebas de sistema | 16: 12 aprobadas (una tras corregir D-01), 4 pendientes |
| Defectos | 16 registrados, 16 cerrados |
| Problemas de la revisión de artefacto | 5: 3 corregidos, 2 parciales |

## 24. Conclusiones

Platita cumple las funcionalidades principales y está desplegada. Las pruebas automatizadas y las de sistema dan evidencia de que el sistema satisface las necesidades planteadas: registrar, controlar y repartir gastos familiares.

Respuesta a la pregunta de la consigna: **sí**, con dos condiciones pendientes que no dependen del código, la configuración de SMTP y de Google en el entorno real, y una mejora de la base de pruebas para no usar la base de producción.

Aprendizajes: los montos con aritmética entera evitan errores de punto flotante; separar consultas de lectura y escritura evita efectos secundarios; y las pruebas de aislamiento son las que más protegen la privacidad entre usuarios.

## 25. Bibliografía y fuentes consultadas

- Documentación oficial de Vue 3 (https://vuejs.org) y Vite (https://vitejs.dev).
- Documentación oficial de Express (https://expressjs.com) y Sequelize (https://sequelize.org).
- Documentación oficial de Jest (https://jestjs.io) y Vitest (https://vitest.dev).
- Documentación de PostgreSQL (https://www.postgresql.org/docs/) y Neon (https://neon.tech/docs).
- Motion, documentación oficial (https://motion.dev).
- Especificación y plan del proyecto: `docs/superpowers/`.
- Consigna de la actividad integradora de la materia.
