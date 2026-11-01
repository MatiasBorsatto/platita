# Pruebas automatizadas

Responsable: Tomas Agustin Gudiño Rubiolo.

## Herramientas

| Ámbito | Herramienta | Versión | Motivo de la elección |
|---|---|---|---|
| Backend: unitarias e integración | Jest 30 con Supertest 7 | Jest 30.5, Supertest 7.3 | Jest es el estándar de Node.js. Supertest prueba la API HTTP sin levantar un servidor fijo, y así se usa la base real del proyecto |
| Frontend: componentes y lógica de la interfaz | Vitest 4 con Vue Test Utils 2.5 | Vitest 4.1, Vue Test Utils 2.5 | Vitest comparte la configuración de Vite del proyecto y es el equivalente nativo de Jest para Vue 3 |

Se usó Jest porque el backend está en Node.js y no en Java. La consigna acepta una herramienta equivalente a JUnit, y Jest cumple ese rol.

## Casos automatizados

Se automatizaron más de tres casos, como pide la consigna. Los que se indican aquí corresponden a los casos de `01-casos-de-prueba.md`.

| Caso | Archivo | Tipo | Qué comprueba |
|---|---|---|---|
| A-01 | `backend/tests/utils/dinero.test.js` | Unitaria | `validarMonto` rechaza cero, negativos, más de dos decimales, valores no numéricos y montos que superan la columna (CN-04 a CN-12) |
| A-02 | `backend/tests/monto-maximo.test.js` | Integración (API) | `POST /api/movimientos` responde 400 con un monto que supera la columna, y 201 con el máximo válido (D-01) |
| A-03 | `frontend/tests/CampoMonto.test.js` | Componente | El campo de monto agrupa miles, mantiene la coma, completa centavos al salir y rechaza letras (CN-16 a CN-21) |
| A-04 | `backend/tests/perfil.test.js` | Integración (API) | Cambio de contraseña solo con la actual correcta; cuenta solo-Google sin contraseña responde 400 |

## Procedimiento

```bash
cd backend && npm test
cd frontend && npm test
```

Las pruebas de backend usan la base del `.env`. Las de frontend no necesitan base.

## Resultados

| Suite | Archivos | Pruebas | Resultado |
|---|---|---|---|
| Backend (Jest) | 27 | 211 | 211 aprobadas |
| Frontend (Vitest) | 22 | 80 | 80 aprobadas |

La ejecución completa de backend pasó de 208 a 211 pruebas después de corregir D-01. Las tres pruebas nuevas son A-01 (una prueba agregada) y A-02 (dos pruebas). Las 208 anteriores siguen aprobadas.

## Ventajas

- Se ejecutan en segundos y repiten el mismo resultado en cada corrida.
- Detectan regresiones sin revisar cada pantalla a mano.
- La prueba de API (A-02) verifica el comportamiento real con la base, no con un mock.

## Limitaciones

- Las pruebas de backend necesitan conexión a la base de Neon. Sin internet no corren.
- Las pruebas de backend crean y borran datos en la base indicada. Conviene una base de pruebas separada (ver R-04 en `06-revision-artefacto.md`).
- El frontend no tiene pruebas de extremo a extremo. Las comprobaciones visuales y de flujo se hicieron a mano en el navegador (ver `04-pruebas-sistema.md`). Una herramienta como Playwright permitiría automatizarlas, y queda como mejora.
- Las pruebas de componentes no detectan problemas de diseño visual.
