# Prompt para generar el guion de la presentación

Copiar el bloque siguiente en un asistente (o en Claude Code dentro de este repositorio) para regenerar el guion.

```text
Actuá como guionista técnico. Escribí el guion completo, en español rioplatense, para la presentación oral
de "Platita", una aplicación web de finanzas personales y familiares, ante la cátedra de Verificación y
Validación de Software (TSDS, 3er año, UPC – Sede Las Varillas). Presentan dos personas:

- Matías Borsatto: arquitectura, casos de prueba de caja negra y blanca, pruebas de sistema, TDD.
- Tomás Agustín Gudiño Rubiolo: automatización de pruebas (Jest, Vitest), revisión de artefactos no
  código, CI/CD, informe técnico.

Fuentes que tenés que usar (no inventes datos que no estén ahí):
- docs/vv/08-informe-tecnico.md (problema, objetivos, requisitos, arquitectura, V&V, defectos, resultados).
- docs/vv/04-pruebas-sistema.md (pruebas de sistema y su estado real).
- frontend/src/tour/pasos.js (qué hace cada módulo, en lenguaje de usuario).
- docs/auditoria-2026-11-10.md (diferencias conocidas entre documentos y código).

Datos actuales que el guion debe respetar:
- Frontend Vue 3 en Netlify; backend Node.js + Express 5 en un servidor Ubuntu propio como servicio
  systemd, expuesto con un túnel ngrok de dominio fijo; base PostgreSQL en Neon con TLS estricto.
- 19 migraciones Sequelize; dinero en centavos con BigInt; bcryptjs 3; JWT en cookies httpOnly.
- 349 pruebas automatizadas: 250 de backend (34 archivos, Jest + Supertest) y 99 de frontend
  (28 archivos, Vitest + Vue Test Utils), todas aprobadas.
- 23 casos formales (CN-01 a CN-23), 16 defectos registrados y cerrados (D-01 a D-16), 5 hallazgos de
  revisión del artefacto docs/instalacion.md (R-01 a R-05).
- Módulos: Movimientos, Categorías, Presupuestos, Gastos fijos, Metas, Grupos (gastos compartidos y
  saldos), Estadísticas, Deudas, Control parental, Perfil, notificaciones (campana) y recorrido guiado
  con botón de ayuda "?".
- El login con Google se retiró; ST-13 y ST-14 figuran como pendientes en 04-pruebas-sistema.md:
  no afirmar que se aprobaron salvo que el equipo lo confirme.

Formato del guion:
1. Duración máxima de 10 minutos (preguntas aparte), alineada con 10 diapositivas. Indicar minuto de inicio de cada bloque.
2. Cada bloque dice quién habla (MATÍAS / TOMÁS), qué se muestra en pantalla (app, informe o código)
   y el texto a decir, en frases cortas y naturales, para leer o parafrasear.
3. Alternar oradores de forma equilibrada; cada uno presenta lo que hizo según su rol.
4. Incluir una demo en vivo de la app con un recorrido concreto (qué clic hacer, qué dato cargar,
   qué resultado señalar) y un plan B si falla la conexión.
5. Explicar V&V con ejemplos reales del proyecto: clases de equivalencia y valores límite de
   validarMonto, caja blanca de validarMonto y calcularSaldos, el ciclo TDD de D-01, la refactorización
   CQS de D-06, la regresión, la revisión de docs/instalacion.md.
6. Cerrar con la respuesta a "¿El sistema satisface las necesidades planteadas?", con matices honestos.
7. Agregar al final: checklist del día (servidor encendido, ngrok, cuentas de demo, datos cargados,
   animaciones activadas en Perfil) y 10 preguntas probables de la cátedra con respuesta sugerida y
   quién la contesta.
8. Evitar relleno, superlativos y frases de marketing. Cifras exactas.
```
