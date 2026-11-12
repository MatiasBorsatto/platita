# Informe Técnico Final: Platita

---

## 1. Portada

* **Proyecto:** Platita – Plataforma Integral para el Control y Gestión de Finanzas Personales y Familiares
* **Etapa:** Etapa 15 – Informe Técnico Final de Verificación y Validación
* **Materia:** Verificación y Validación de Software
* **Carrera / Curso:** Tercer Año "TSDS" (Tecnicatura Superior en Desarrollo de Software)
* **Institución:** Universidad Provincial de Córdoba (UPC) – Sede Regional Las Varillas
* **Fecha de Emisión:** Noviembre de 2026

---

## 2. Integrantes

| Nombre Completo | Usuario GitHub | Rol Principal en el Proyecto |
|---|---|---|
| **Matías Borsatto** | `MatiasBorsatto` | Arquitectura, Casos de Prueba (Caja Negra y Blanca), Pruebas de Sistema, TDD |
| **Tomás Agustín Gudiño Rubiolo** | `Tomas` (`tomasgrubiolo`) | Automatización de Pruebas (Jest, Vitest), Revisión de Artefactos, CI/CD, Informe Técnico |

---

## 3. Descripción del Problema

La gestión de las finanzas personales y familiares representa un desafío constante para la mayoría de los hogares. Frecuentemente, las personas carecen de visibilidad sobre sus patrones reales de consumo, no disponen de mecanismos ágiles para saber cuánto dinero remanente tienen en sus presupuestos antes de fin de mes y enfrentan fricciones cotidianas al momento de conciliar cuentas compartidas (alquileres, servicios, compras del supermercado, vacaciones o salidas grupales).

El empleo de planillas de cálculo tradicionales (como Excel o Google Sheets) adolece de problemas estructurales:
1. **Falta de sincronización e integridad concurrente:** Dificultad para registrar gastos en tiempo real desde dispositivos móviles.
2. **Imprecisión numérica y errores de redondeo:** Problemas derivados de la representación en coma flotante estándar de los navegadores.
3. **Ausencia de separación estricta de alcances:** No existe una frontera clara entre los gastos puramente individuales y aquellos asumidos en copropiedad o a nombre de un grupo familiar.
4. **Cálculo manual propenso a desbalances:** La división de gastos y la liquidación de saldos interpersonales ("quién le debe a quién") suele generar discrepancias y olvidos.

**Platita** surge para dar respuesta integral a esta problemática, proveyendo un entorno centralizado, seguro y colaborativo donde registrar ingresos y egresos, proyectar gastos fijos, controlar presupuestos con alertas preventivas y saldar deudas familiares con total exactitud de centavos.

---

## 4. Objetivos

### 4.1 Objetivo General
Diseñar, implementar y someter a un proceso riguroso de Verificación y Validación (V&V) una aplicación web multiplataforma que facilite la administración económica personal y compartida, garantizando la fiabilidad en los cálculos monetarios, el aislamiento entre usuarios y una óptima experiencia de usuario.

### 4.2 Objetivos Específicos
* **Exactitud contable:** Implementar una política estricta de cálculo monetario basada en enteros (centavos) para erradicar errores de coma flotante.
* **Presupuestación proactiva:** Proveer control mensual de gastos por categoría, disparando alertas automáticas ante consumos del 80 % y 100 % del límite fijado.
* **Compromisos y gastos fijos:** Permitir la gestión de obligaciones periódicas y cuotas con imputación temporal predecible.
* **Colaboración familiar:** Implementar grupos con códigos de invitación y roles administrativos, con esquemas de distribución de gastos (partes iguales o asignación fija por participante) y motor de resolución de saldos cruzados.
* **Ahorro sistemático:** Administrar metas de ahorro vinculadas o independientes de movimientos bancarios/efectivo.
* **Calidad de software comprobable:** Diseñar y ejecutar estrategias de prueba en múltiples niveles (unitarias, integración, componentes y sistema), documentando defectos, pruebas de regresión, ciclos TDD y revisión de documentación técnica.

---

## 5. Requisitos del Sistema

### 5.1 Requisitos Funcionales (RF)
* **RF-01 (Autenticación y Sesión):** Registro e inicio de sesión seguro mediante email y contraseña cifrada con hash robusto (bcrypt). Persistencia de sesión mediante tokens JWT transmitidos en cookies `httpOnly` seguras. Cierre de sesión y refresco periódico transparente (`POST /api/auth/refresh`).
* **RF-02 (Gestión de Categorías):** Categorías base precargadas del sistema (Alimentación, Transporte, Servicios, etc.) y capacidad para que cada usuario cree, edite y archive categorías personalizadas con icono y color propio.
* **RF-03 (Movimientos Personales):** Registro de ingresos y gastos individuales con fecha, monto validado, categoría asociada, notas y alcance individual. Filtros por rango temporal, categoría y búsqueda textual con paginación.
* **RF-04 (Presupuestos Mensuales):** Establecimiento de techos de gasto mensuales por categoría. Notificación visual in-app al alcanzar el 80 % y al superar el 100 % del presupuesto.
* **RF-05 (Gastos Fijos y Recurrentes):** Planificación de gastos fijos periódicos y conceptos con vencimiento mensual o en cantidad determinada de cuotas.
* **RF-06 (Metas de Ahorro):** Creación de metas con monto objetivo y fecha límite. Registro de aportes manuales o derivados de movimientos de ahorro. Visualización del porcentaje alcanzado.
* **RF-07 (Grupos Familiares y Membresías):** Creación de grupos, emisión y aceptación de invitaciones seguras por token/código, asignación de roles (Administrador / Miembro).
* **RF-08 (Gastos Compartidos y División):** Carga de gastos grupales abonados por un integrante con partición configurable: en partes iguales (sin pérdida de centavos residuales) o con montos personalizados por miembro.
* **RF-09 (Liquidación de Saldos y Pagos):** Cálculo automático de matriz de deudas dentro del grupo familiar y registro de transferencias/pagos entre miembros para saldar balances.
* **RF-10 (Estadísticas y Análisis):** Gráficos de distribución de gastos por categoría, evolución mensual de ahorro neto e históricos anuales.

### 5.2 Requisitos No Funcionales (RNF)
* **RNF-01 (Precisión Numérica):** Todos los montos deben almacenarse y procesarse con exactitud de dos decimales (columna `DECIMAL(12,2)` en base de datos; internamente procesados en centavos `BigInt` en el backend para evitar discrepancias aritméticas).
* **RNF-02 (Seguridad y Privacidad Multiusuario):** Aislamiento estricto de datos. Ningún usuario puede consultar, modificar o eliminar registros, movimientos o presupuestos que no le pertenezcan (`WHERE usuarioId = req.usuario.id`).
* **RNF-03 (Cifrado y Seguridad en Tránsito):** Comunicación forzada vía HTTPS y conexión TLS obligatoria hacia el motor de base de datos (`rejectUnauthorized: true`).
* **RNF-04 (Responsividad y Accesibilidad):** Interfaz fluida adaptable a resoluciones móviles (desde 375 px de ancho de pantalla) hasta monitores de escritorio (1024+ px). Cumplimiento de estándares de contraste visual y navegación por teclado.
* **RNF-05 (Resiliencia e Idempotencia):** Bloqueo de envíos concurrentes (anti-doble submit) en todos los formularios para prevenir la creación de movimientos duplicados por doble clic accidental.

---

## 6. Descripción del Sistema

Platita fue concebido bajo el patrón de **Arquitectura en Tres Capas**, asegurando una alta cohesión interna y un bajo acoplamiento entre la presentación, las reglas de negocio y el almacenamiento de datos:

```
[ Cliente Web / Navegador ] (Vue 3 SPA - Netlify)
         │
         │ Peticiones HTTPS / JSON (Cookies httpOnly)
         ▼
[ Servidor de Aplicaciones ] (Node.js + Express 5 - servidor Ubuntu propio, expuesto con ngrok)
  ├── Middlewares (Auth JWT, Manejador de Errores, Validador)
  ├── Módulos de Dominio (Movimientos, Presupuestos, Gastos Fijos, Grupos, Saldos)
  └── Capa de Persistencia (Sequelize ORM)
         │
         │ Conexión TLS / Pool SSL
         ▼
[ Servidor de Base de Datos ] (PostgreSQL - Neon Serverless)
```

1. **Capa de Presentación (Frontend):**
   * Single Page Application (SPA) desarrollada con **Vue 3** (Composition API y `<script setup>`).
   * Enrutamiento dinámico protegido con **Vue Router** mediante guardias globales (`beforeEach`) que interceptan rutas autenticadas.
   * Gestión del estado global con **Pinia** (tiendas especializadas de sesión, notificaciones y preferencias).
   * Visualización gráfica interactiva con **Chart.js** y microinteracciones fluidas mediante la librería **Motion**.
   * Alojada y desplegada en **Netlify**, utilizando reglas de redirección para manejar URLs amigables y proxy inverso hacia la API.

2. **Capa de Lógica de Negocio (Backend):**
   * API REST construida sobre **Node.js** con el framework **Express 5**.
   * Estructura modular por componentes de negocio: autenticación (`auth`), usuarios (`usuario`), categorías (`categorias`), movimientos (`movimientos`), gastos fijos (`gastos-fijos`), presupuestos (`presupuestos`), metas (`metas`), grupos familiares (`grupos`), liquidación (`saldos`) y reportes (`estadisticas`).
   * Manejador centralizado de errores asíncronos que intercepta fallos de validación, colisiones de unicidad o excepciones de autorización y responde códigos HTTP normalizados (400, 401, 403, 404, 409, 500).
   * Alojado en un servidor Ubuntu propio como servicio `systemd` (`finanzas-backend`), que arranca solo al encender el equipo; un túnel **ngrok** con dominio fijo lo expone por HTTPS y Netlify le reenvía las peticiones `/api/*`.

3. **Capa de Datos (Persistencia):**
   * Base de datos relacional **PostgreSQL** alojada en la infraestructura elástica de **Neon**.
   * Mapeo objeto-relacional (ORM) mediante **Sequelize 6**, administrado estrictamente a través de **19 migraciones SQL reversibles**, garantizando la trazabilidad histórica de los cambios de esquema.

---

## 7. Tecnologías Utilizadas

| Categoría | Tecnología | Versión | Rol en el Proyecto |
|---|---|---|---|
| **Frontend Framework** | Vue.js | 3.5.x | Creación de componentes reactivos y vistas de usuario |
| **Herramienta de Build** | Vite | 8.x / 5.x | Compilación y empaquetado ultrarrápido para producción |
| **Enrutamiento** | Vue Router | 5.x | Navegación del lado del cliente y protección de rutas |
| **Manejo de Estado** | Pinia | 4.x | Almacén reactivo de datos de usuario y sesión activa |
| **Gráficos** | Chart.js | 4.6.x | Renderizado de gráficos de barras y tortas para estadísticas |
| **Animación** | Motion | 14.3.x | Transiciones de página e indicadores visuales de estado |
| **Backend Runtime** | Node.js | >= 20.x | Entorno de ejecución de servidor en JavaScript |
| **Framework HTTP** | Express | 5.x | Exposición y ruteo de endpoints de la API REST |
| **ORM / Migraciones** | Sequelize | 6.x | Abstracción de base de datos y control de esquema |
| **Base de Datos** | PostgreSQL (Neon) | 16.x | Motor relacional con réplicas y conexión SSL obligatoria |
| **Seguridad y Criptografía** | bcryptjs / jsonwebtoken | 3.x / 9.x | Cifrado unidireccional de contraseñas y firma de tokens |
| **Pruebas de Backend** | Jest + Supertest | 30.x / 7.x | Pruebas unitarias y de integración sobre la API HTTP real |
| **Pruebas de Frontend** | Vitest + Vue Test Utils | 4.x / 2.5.x | Pruebas de componentes de interfaz y lógica reactiva |
| **Plataformas de Despliegue** | Netlify + servidor Ubuntu con ngrok | PaaS / propio | Hosting continuo del frontend (SPA); backend (Node API) como servicio `systemd` expuesto por túnel ngrok |
| **Control de Versiones** | Git & GitHub | SCM | Control de versiones distribuido y flujos de integración |

---

## 8. Planificación

El proyecto fue planificado con un enfoque iterativo incremental estructurado en **6 fases y 29 tareas**, detalladas en el documento de especificación técnica (`docs/superpowers/plans/2026-10-27-finanzas-jaki.md`). Cada tarea estuvo asociada a entregables concretos, criterios de aceptación formal y control de calidad previo a la integración.

### 8.1 Fases del Proyecto
1. **Fase 1 – Arquitectura Base y Autenticación:** Configuración del repositorio, base de datos Neon con SSL, esqueleto Express y módulo de autenticación con cookies seguras.
2. **Fase 2 – Gestión Financiera Personal:** Implementación de categorías, movimientos individuales con precisión entera y control de presupuestos mensuales con alertas preventivas.
3. **Fase 3 – Gastos Recurrentes y Metas:** Creación de compromisos periódicos, metas de ahorro con aportes y seguimiento temporal.
4. **Fase 4 – Grupos Familiares y Finanzas Compartidas:** Mecanismos de invitación, registro de gastos compartidos con partición equitativa y personalizada, y algoritmo de resolución de saldos cruzados.
5. **Fase 5 – Análisis, Estadísticas y UI Responsiva:** Gráficos mensuales e históricos, rediseño visual de marca (Platita), adaptación móvil a 375 px, modo oscuro y accesibilidad.
6. **Fase 6 – Verificación, Validación y Auditoría de Calidad:** Diseño y ejecución de casos de prueba de caja negra/blanca, automatización de suites, pruebas de regresión, corrección de defectos y confección del informe técnico final.

### 8.2 División de Responsabilidades
* **Matías Borsatto:** Diseño de la matriz de casos de prueba (caja negra y caja blanca), ejecución de pruebas de sistema, registro inicial y diagnóstico de defectos de seguridad/cálculo, ciclos de TDD y pruebas de regresión.
* **Tomás Agustín Gudiño Rubiolo:** Configuración e implementación de la suite de pruebas automatizadas (Jest/Supertest y Vitest/VTU), auditoría e inspección del artefacto no código (`docs/instalacion.md`), resolución de incidencias en el pipeline de despliegue y elaboración del informe técnico consolidado.

---

## 9. Desarrollo

El desarrollo se llevó a cabo utilizando Git y GitHub (`https://github.com/MatiasBorsatto/platita`), trabajando en ramas funcionales (`feature/finanzas-jaki`) con integración controlada hacia `main`. 

A lo largo del proceso se aplicaron buenas prácticas de ingeniería de software:
* **Separación de responsabilidades:** La lógica de cálculo monetario se encapsuló en módulos independientes (`backend/src/utils/dinero.js`) desacoplada de los controladores de Express.
* **Transaccionalidad en operaciones complejas:** En los gastos compartidos y la edición de movimientos vinculados a metas, todas las escrituras se englobaron en transacciones ACID de Sequelize para evitar datos huérfanos.
* **Evolución del modelo:** Inicialmente se incluyó un módulo de tarjetas de crédito que posteriormente fue reemplazado por un modelo más flexible y realista de **Gastos Fijos** (migración `013-gastos-fijos.js`), permitiendo modelar cuotas finitas y compromisos recurrentes mensuales sin atarse a resúmenes bancarios rígidos.
* **Funciones incorporadas en la etapa final:** control parental (un menor sin tutor solo accede a sus funciones personales; con tutor, a lo que este le habilite), soporte multimoneda en movimientos, presupuestos, metas y gastos fijos (migraciones 017 a 019), y un recorrido guiado interactivo por todos los módulos, que se muestra en el primer ingreso y se puede repetir desde el botón de ayuda.
* **QA final previo a la presentación (12/11/2026):** una pasada estricta cerró 20 hallazgos, cada uno con su prueba automatizada. Entre ellos: las alertas de presupuesto pasaron a generarse solo ante cambios en los gastos (las consultas ya no escriben, CQS); el pago doble simultáneo de una cuota quedó bloqueado; los vínculos de control parental se eliminan al salir del grupo; la sesión vencida lleva al login. En velocidad, los recordatorios bajaron de 1,57 s a 0,50 s y la primera carga del frontend de 176 kB a 93,6 kB. Detalle en `docs/auditoria-2026-11-12.md`.
* **Control de versiones de código y despliegue continuo:** Cada push a la rama `main` activó automáticamente la compilación del frontend en Netlify; el backend se actualiza en el servidor propio y se reinicia con `systemctl restart finanzas-backend`.

---

## 10. Estrategia de Verificación y Validación

La estrategia de aseguramiento de calidad se apoyó en los conceptos fundamentales de la disciplina de V&V:

* **Verificación ("¿Estamos construyendo el producto correctamente?"):**
  Se evaluó la conformidad del código y los artefactos contra los estándares de diseño y especificación técnica. Incluyó revisiones estáticas de código, análisis de caminos lógicos en caja blanca, chequeo de integridad referencial de base de datos y la inspección formal de documentos no código (`docs/instalacion.md`).

* **Validación ("¿Estamos construyendo el producto correcto?"):**
  Se comprobó que el sistema responde de manera efectiva a las necesidades reales de los usuarios finales (gestión de dinero real sin errores de centavos, colaboración familiar sin desajustes y visualización clara en pantallas de teléfonos móviles). Se materializó mediante pruebas de sistema de extremo a extremo (E2E), simulando recorridos de usuario sobre navegadores reales conectados al backend y a la base de datos de producción.

### Pirámide de Pruebas Implementada
```
        /  Pruebas de Sistema  \       --> 16 pruebas manuales en navegador Chromium
       /  Pruebas de Integración \     --> Flujos de API HTTP con BD Neon real
      /   Pruebas de Componentes  \    --> Pruebas de vistas y componentes con Vitest
     /      Pruebas Unitarias      \   --> Lógica pura de dinero, fechas y saldos
```

---

## 11. Casos de Prueba

Se diseñó una matriz formal de **23 casos de prueba principales**, siguiendo rigurosamente la plantilla estándar de la cátedra:
* **Identificador único (ID)**
* **Funcionalidad evaluada**
* **Objetivo de la prueba**
* **Precondiciones requeridas**
* **Datos de entrada específicos**
* **Procedimiento paso a paso**
* **Resultado esperado**
* **Resultado obtenido**
* **Estado de la prueba (Aprobado / Fallido)**
* **Observaciones y referencias cruzadas**

La matriz completa abarca tanto técnicas funcionales de caja negra (clases de equivalencia, valores límite) como estructurales de caja blanca (cobertura de instrucciones, decisiones y caminos).

---

## 12. Pruebas de Caja Negra

Las pruebas de caja negra evaluaron las interfaces externas del software sin considerar su lógica interna, aplicando **Partición en Clases de Equivalencia (EP)** y **Análisis de Valores Límite (BVA)** sobre el motor de dinero (`dinero.js`) y los formularios de la interfaz (`CampoMonto.vue`).

### 12.1 Matriz de Clases de Equivalencia y Valores Límite (Dinero y Montos)

| ID | Funcionalidad | Objetivo / Partición | Datos de Entrada | Resultado Esperado | Resultado Obtenido | Estado |
|---|---|---|---|---|---|---|
| **CN-01** | `validarMonto` | Entero positivo válido | `"1500"` | Retorna `"1500.00"` | Retorna `"1500.00"` | **Aprobado** |
| **CN-02** | `validarMonto` | Decimal con 1 dígito | `"12.5"` | Retorna `"12.50"` | Retorna `"12.50"` | **Aprobado** |
| **CN-03** | `validarMonto` | Límite inferior válido (mínimo) | `"0.01"` | Retorna `"0.01"` | Retorna `"0.01"` | **Aprobado** |
| **CN-04** | `validarMonto` | Límite inválido: Cero | `"0"` | Error 400: "El monto debe ser mayor que 0" | Error 400: mensaje correcto | **Aprobado** |
| **CN-05** | `validarMonto` | Límite inválido: Cero decimal | `"0.00"` | Error 400: "El monto debe ser mayor que 0" | Error 400: mensaje correcto | **Aprobado** |
| **CN-06** | `validarMonto` | Partición inválida: Negativo | `"-5"` | Error 400: "El monto debe ser un número positivo" | Error 400: mensaje correcto | **Aprobado** |
| **CN-07** | `validarMonto` | Inválido: Más de 2 decimales | `"1.234"` | Error 400: "no puede tener más de 2 decimales" | Error 400: mensaje correcto | **Aprobado** |
| **CN-08** | `validarMonto` | Inválido: Cadena alfabética | `"abc"` | Error 400: "El monto debe ser un número positivo" | Error 400: mensaje correcto | **Aprobado** |
| **CN-09** | `validarMonto` | Inválido: Cadena vacía | `""` | Error 400: "El monto debe ser un número positivo" | Error 400: mensaje correcto | **Aprobado** |
| **CN-10** | `validarMonto` | Inválido: Tipo nulo | `null` | Error 400: "El monto debe ser un número" | Error 400: mensaje correcto | **Aprobado** |
| **CN-11** | `validarMonto` | Límite superior: Máximo columna | `"9999999999.99"` | Retorna `"9999999999.99"` | Retorna `"9999999999.99"` | **Aprobado** |
| **CN-12** | `validarMonto` | Desborde de columna (11 enteros) | `"10000000000.00"` | Error 400: "supera el máximo permitido" | Retornaba valor; BD daba 500 | **Fallido** (Origen D-01) |
| **CN-13** | `sumar` | Suma de centavos exacta | `["0.10", "0.20"]` | Retorna `"0.30"` (sin error `0.30000000000000004`) | Retorna `"0.30"` | **Aprobado** |
| **CN-14** | `dividirEnPartes` | División con resto indivisible | `"100.00"`, 3 partes | `["33.34", "33.33", "33.33"]` (suma exacta 100.00) | Partición exacta sin pérdida | **Aprobado** |
| **CN-15** | `dividirEnPartes` | Límite inválido: 0 partes | `"100.00"`, 0 partes | Error 400: "entero mayor o igual a 1" | Error 400: mensaje correcto | **Aprobado** |

### 12.2 Caja Negra en la Interfaz de Usuario (`CampoMonto.vue`)

| ID | Objetivo | Entrada del Usuario | Comportamiento Esperado | Estado |
|---|---|---|---|---|
| **CN-16** | Separador de miles dinámico | Teclea `"30000"` | Muestra `"30.000"` en tiempo real; emite `"30000"` | **Aprobado** |
| **CN-17** | Manejo de coma decimal | Teclea `"1500,5"` | Muestra `"1.500,5"`; emite `"1500.50"` | **Aprobado** |
| **CN-18** | Autocompletado al desenfocar | Teclea `"1500"` + evento blur | Formatea a `"1.500,00"`; emite `"1500.00"` | **Aprobado** |
| **CN-19** | Distinción de punto como miles | Pega `"1.500"` | Mantiene formato de mil `"1.500"` sin interpretarlo decimal | **Aprobado** |
| **CN-20** | Carga de valor externo | Prop `modelValue = "1500.50"` | Muestra `"1.500,50"` de forma transparente | **Aprobado** |
| **CN-21** | Bloqueo de caracteres no válidos | Teclea `"ab"` + blur | Limpia el campo a vacío; emite cadena vacía | **Aprobado** |

### 12.3 Caja Negra en Resolución de Saldos (`calcularSaldos`)

| ID | Funcionalidad | Datos de Entrada | Resultado Esperado | Estado |
|---|---|---|---|---|
| **CN-22** | `calcularSaldos` | Pagó $100.00; Participación: A=$40.00, B=$60.00 | Saldo A: `"+60.00"`, Saldo B: `"-60.00"` (Suma cero) | **Aprobado** |
| **CN-23** | `calcularSaldos` | Pagó $100.00; Participación: A=$40.00 (incompleto) | Error interno de integridad: "los saldos no suman cero" | **Aprobado** |

---

## 13. Pruebas de Caja Blanca

Las pruebas de caja blanca evaluaron la estructura interna del código fuente para asegurar la cobertura lógica de ramas, condiciones y sentencias.

### 13.1 Análisis de `validarMonto` (`backend/src/utils/dinero.js`)
* **Grafo de flujo y decisiones:**
  * **Decisión 1 (Tipo):** ¿`typeof valor` es string o número? Si no, lanza `ErrorValidacion('El monto debe ser un número')`. *(Cubierto por CN-10)*.
  * **Decisión 2 (Formato Regex):** ¿Coincide con `/^\d+(\.\d{1,2})?$/`? Si no, evalúa signo o caracteres inválidos. *(Cubierto por CN-06, CN-08, CN-09)*.
  * **Decisión 3 (Rango inferior):** ¿`centavos <= 0n`? Si es verdadero, rechaza con "debe ser mayor que 0". *(Cubierto por CN-04 y CN-05)*.
  * **Decisión 4 (Rango superior - hallazgo D-01):** Inicialmente el código carecía de esta decisión. Se introdujo:
    ```javascript
    const MAXIMO_CENTAVOS = 999999999999n; // 9.999.999.999,99 (10 enteros, 2 decimales)
    if (centavos > MAXIMO_CENTAVOS) {
      throw new ErrorValidacion('El monto supera el máximo permitido');
    }
    ```
* **Resultado del análisis:** Cobertura de instrucciones del 100 %, cobertura de ramas del 100 %. La aplicación de caja blanca reveló que un número de 11 dígitos enteros atravesaba la función sin error, generando la caída de base de datos documentada en D-01.

### 13.2 Análisis de `calcularSaldos` (`backend/src/modules/saldos/saldos.calculo.js`)
* **Decisiones evaluadas:**
  * Existencia de participantes en el grupo.
  * Recorrido acumulativo de aportes vs. participaciones asignadas.
  * Verificación de la invariante contable de suma cero (`abs(suma) === 0n`).
* **Cobertura:** Todos los caminos del bucle y la aserción final de balance quedaron cubiertos en las pruebas unitarias y de integración de saldos.

---

## 14. Pruebas Unitarias

Las pruebas unitarias se enfocaron en aislar las unidades mínimas de código y validar su comportamiento sin dependencias externas:

1. **Aritmética y Dinero (`backend/tests/utils/dinero.test.js`):**
   * Validación de `aCentavos`, `deCentavos`, `sumar`, `restar`, `multiplicar` y `dividirEnPartes`.
   * Comprobación de que no existen pérdidas de centavos por truncamiento.
2. **Utilidades de Fechas (`backend/src/utils/fechas.js`):**
   * Comportamiento ante meses con diferente cantidad de días (28, 30 y 31 días, años bisiestos).
   * Cálculo de períodos de vencimiento para cuotas recurrentes.
3. **Componentes Reactivos de Frontend (`frontend/tests/`):**
   * `CampoMonto.test.js`: Comportamiento de máscara de entrada y eventos `@update:modelValue`.
   * `CargandoIndicador.test.js`: Renderizado condicional y visibilidad accesible del spinner.
   * `BarraPresupuesto.test.js`: Coloreado dinámico (verde en normalidad, amarillo al 80 %, rojo al 100 %).
   * `BarraMeta.test.js`: Cálculo de porcentaje de avance de ahorro.

---

## 15. Pruebas de Integración

Las pruebas de integración validaron la interacción armónica entre módulos de software, middlewares de Express y la base de datos real PostgreSQL en Neon:

* **Suite de Registro e Inicio de Sesión (`auth.test.js`):**
  * Flujo completo: Registro (`POST /api/auth/registro`), persistencia en base, emisión de cookie `accessToken` y `refreshToken`, renovación mediante `/refresh` y destrucción segura de cookies en `/logout`.
* **Manejo de Desborde y Límites (`monto-maximo.test.js`):**
  * Envío de payload con valor límite válido (`9999999999.99`) retorna HTTP 201 y persiste correctamente en la base.
  * Envío de payload con desborde (`10000000000.00`) retorna HTTP 400 controlado, sin generar error 500 en Sequelize.
* **Aislamiento Multitenant entre Usuarios (`aislamiento.test.js`):**
  * Se crean dos usuarios (`Usuario A` y `Usuario B`) en la base real.
  * `Usuario B` intenta consultar, editar y borrar movimientos, categorías, metas y presupuestos de `Usuario A`.
  * Verificación de que la API responde sistemáticamente con `404 Not Found` o `403 Forbidden` y no altera los registros del dueño.
* **Ciclo Integral de Grupo Familiar (`grupos.test.js`, `aportes-gastos-compartidos.test.js`):**
  * Creación del grupo por el Administrador.
  * Generación de invitación y aceptación por parte de un segundo miembro.
  * Creación de gasto compartido con partición personalizada.
  * Registro de aportes y comprobación de actualización del balance en el módulo de saldos.

---

## 16. Pruebas de Sistema

Las pruebas de sistema evaluaron el comportamiento global de la aplicación integrada desplegada en un entorno representativo de producción (frontend SPA, backend Express y PostgreSQL Neon), ejecutadas por el equipo sobre el navegador Chromium:

| ID | Funcionalidad Evaluada | Procedimiento de Prueba | Resultado Esperado | Resultado Obtenido | Estado Final |
|---|---|---|---|---|---|
| **ST-01** | Inicio de sesión | Ingreso con credenciales válidas creadas | Redirección inmediata al dashboard `/movimientos` | Acceso concedido y sesión establecida | **Aprobado** |
| **ST-02** | Alta de movimiento | Carga de formulario con monto, categoría y nota | Guardado en base y notificación toast "Guardado" | Movimiento visible en la lista inmediatamente | **Aprobado** |
| **ST-03** | Formato de monto | Teclear "30000" y hacer clic fuera | Visualización con formato local `"30.000,00"` | Formateo visual exacto | **Aprobado** |
| **ST-04** | Protección doble click | Doble clic rápido sobre el botón "Guardar" | Bloqueo del botón y creación de un único registro | Un solo movimiento insertado | **Aprobado** |
| **ST-05** | Diálogo de borrado | Clic en "Eliminar" en una transacción | Modal propio con foco en "Cancelar" y cierre con `Esc` | Diálogo accesible sin bloqueos | **Aprobado** |
| **ST-06** | Panel de notificaciones | Clic en icono de campana | Panel flotante desplegado sin solapar módulos activos | Notificaciones legibles y dismissible | **Aprobado** |
| **ST-07** | Control de desborde | Enviar 10.000.000.000,00 por la API | HTTP 400 controlado con mensaje claro | 500 inicial (D-01); HTTP 400 tras fix | **Aprobado** |
| **ST-08** | Responsividad escritorio | Recorrido de vistas a 1024 px de ancho | Layout balanceado sin desborde horizontal | Verificado en todas las vistas | **Aprobado** |
| **ST-09** | Responsividad celular | Recorrido de vistas a 375 px (iPhone SE / estándar) | Barra inferior fija, campos accesibles (>=44 px) | Layout adaptable y operable con pulgar | **Aprobado** |
| **ST-10** | Responsividad tablet | Recorrido de vistas a 768 px (iPad) | Barra lateral compacta y tarjetas ordenadas | Comportamiento responsive adecuado | **Aprobado** |
| **ST-11** | Modo oscuro | Activación de tema oscuro del sistema | Colores contrastantes legibles sin fatiga | Verificado en gráficos y paneles | **Aprobado** |
| **ST-12** | Indicadores de carga | Navegación entre módulos con latencia simulada | Skeleton screens y spinner visible | Retroalimentación visual continua | **Aprobado** |
| **ST-13** | Barra superior de progreso | Peticiones asíncronas lentas | Barra delgada superior indicando progreso | Verificada en peticiones pesadas | **Aprobado** |
| **ST-14** | Reparto personalizado UI | Ajuste manual de aportes por miembro | Validación en vivo de que la suma iguala el total | Botón habilitado solo al coincidir la suma | **Aprobado** |
| **ST-15** | Recuperación por correo | Solicitud de reseteo de clave | Recepción de email con enlace seguro | Supeditado a credenciales SMTP en prod | *Doc. Operativa* |
| **ST-16** | Flujo completo de grupo | Invitación y resolución de saldos entre 2 usuarios | Deuda liquidada tras registrar transferencia | Balance vuelve a cero correctamente | **Aprobado** |

---

## 17. Automatización de Pruebas

Para asegurar la repetibilidad y agilidad del ciclo de verificación, se implementaron suites automatizadas independientes para el backend y el frontend.

### 17.1 Herramientas Empleadas
* **Backend:** **Jest 30** complementado con **Supertest 7**. Se seleccionó Jest por su madurez y compatibilidad nativa en el ecosistema Node.js (equivalente al estándar JUnit exigido en entornos académicos). Supertest permite disparar peticiones HTTP en memoria contra la aplicación Express conectada a la base de pruebas.
* **Frontend:** **Vitest 4** en conjunto con **@vue/test-utils 2.5**. Vitest aprovecha la misma configuración y árbol de dependencias de Vite, garantizando velocidad de ejecución y soporte nativo para Single File Components (`.vue`).

### 17.2 Cobertura y Métricas de Automatización

```bash
# Ejecución de suites:
cd backend  && npm test
cd frontend && npm test
```

| Suite | Motor | Archivos de Prueba | Casos Ejecutados | Tasa de Éxito |
|---|---|---|---|---|
| **Backend API & Lógica** | Jest + Supertest | 34 archivos | 263 pruebas | **100 % (263/263 aprobadas)** |
| **Frontend UI & Tiendas** | Vitest + Vue Test Utils | 28 archivos | 105 pruebas | **100 % (105/105 aprobadas)** |
| **Total Global Automatizado** | — | **62 archivos** | **368 pruebas** | **100 % Aprobación** |

### 17.3 Ventajas y Limitaciones Observadas
* **Ventajas:**
  * Velocidad de ejecución: las 368 pruebas se completan en menos de 15 segundos en total.
  * Detección temprana de regresiones ante cambios en esquemas de base de datos o lógica de negocio.
  * Las pruebas de API verifican restricciones reales de base de datos (claves foráneas, índices de unicidad y triggers), no simulaciones en memoria.
* **Limitaciones:**
  * Las pruebas de integración de backend requieren conexión activa a internet para interactuar con la base PostgreSQL en Neon.
  * Requiere disciplina de limpieza para no dejar registros huérfanos al abortar pruebas anticipadamente.

---

## 18. TDD y Refactorización

### 18.1 Caso de TDD: Validación de Límites Numéricos de Dinero
El proceso de corrección del defecto **D-01** ilustró el ciclo de Desarrollo Guiado por Pruebas:

```
    [ 1. RED ]    Escribir test de integración esperando 400 ante 10.000.000.000,00
         │        --> Falla con HTTP 500 (desborde de columna DECIMAL en PostgreSQL)
         ▼
   [ 2. GREEN ]   Incorporar MAXIMO_CENTAVOS = 999999999999n en backend/src/utils/dinero.js
         │        --> El test pasa con HTTP 400 Bad Request
         ▼
  [ 3. REFACTOR ] Limpiar validadores, centralizar mensaje de error y verificar suite completa
                  --> 211 tests de backend aprobados sin regresiones
```

> *Nota de rigor metodológico:* Si bien en la etapa temprana de prototipado algunas pruebas se elaboraron paralelamente al código, en las fases críticas de cálculo y corrección de incidencias se respetó el flujo guiado por pruebas antes de dar por cerrada la tarea.

### 18.2 Caso de Refactorización: Consulta sin Efectos Secundarios en Presupuestos
* **Olor de código detectado (Code Smell):** La función `estadoPresupuestos` realizaba el cálculo analítico de desvíos y, al mismo tiempo, **insertaba registros de alerta en la tabla de notificaciones de la base de datos**. Al ser invocada por el módulo de estadísticas para graficar el resumen del mes, el mero acto de "consultar" generaba notificaciones duplicadas en la campana del usuario (defecto **D-06**).
* **Solución aplicada:** Se aplicó el principio de **Separación de Responsabilidades (CQS - Command Query Separation)**:
  * `calcularEstadosPresupuestos`: Función pura de solo lectura, encargada de la analítica sin tocar el estado de la base de datos.
  * `registrarAlertasPresupuesto`: Función específica de comando que solo se activa ante eventos de mutación de movimientos.
* **Beneficio:** Las estadísticas y resúmenes se volvieron idempotentes y libres de efectos colaterales.

---

## 19. Pruebas de Regresión

Se estableció como regla estricta que **ningún commit de corrección de defecto es aceptado sin la ejecución total de las suites de prueba existentes**.

| Evento de Cambio | Suite Previa | Modificación Efectuada | Regresión Ejecutada | Resultado |
|---|---|---|---|---|
| **Corrección D-01 (Monto Máximo)** | 208 pruebas backend | Incorporación de tope en `dinero.js` y middleware | 211 pruebas backend (+3 añadidas) | **100 % Aprobado** (Cero regresiones) |
| **Corrección D-16 (Anti-doble click)** | 74 pruebas frontend | Directiva de bloqueo y estado reactivo | 80 pruebas frontend (+6 añadidas) | **100 % Aprobado** |
| **Sustitución Tarjetas por Gastos Fijos** | 211 backend / 80 frontend | Eliminación de tarjetas, creación de gastos fijos y migración 013 | Suites actualizadas y ejecutadas | **100 % Aprobado** |
| **Corrección de Build Netlify (CI)** | Falla en Vite PostCSS | Arreglo de sintaxis CSS y remoción de submódulo Git inválido | Build limpio en local y despliegue exitoso en Netlify | **Despliegue operativo** |

Las pruebas que mayor valor preventivo brindaron fueron las de **aislamiento entre usuarios** (`backend/tests/aislamiento.test.js`), ya que garantizan que modificaciones en los filtros de Sequelize jamás expongan datos sensibles entre distintos miembros.

---

## 20. Defectos Encontrados

Durante las diferentes etapas del proyecto se registraron formalmente **16 defectos funcionales y de seguridad**, los cuales fueron resueltos en su totalidad:

| ID | Módulo Afectado | Descripción del Fallo | Severidad | Causa Raíz | Solución Implementada | Estado |
|---|---|---|---|---|---|---|
| **D-01** | Movimientos / Dinero | Monto de 11 dígitos enteros causaba error 500 | Media | Ausencia de cota superior en `validarMonto` | Validación de cota máxima `9999999999.99` (400) | **Cerrado** |
| **D-02** | Base de Datos / Conexión | Conexión SSL vulnerable con `rejectUnauthorized: false` | Crítica | Omisión de verificación estricta de certificados TLS | Forzado de TLS estricto en configuración Neon | **Cerrado** |
| **D-03** | Autenticación / Clave | Enumeración de cuentas en solicitud de recupero | Alta | Mensajes dispares para correos existentes e inexistentes | Respuesta uniforme HTTP 200 independiente del correo | **Cerrado** |
| **D-04** | Backend / Performance | Endpoint de recuperación quedaba bloqueado por envío SMTP | Media | Espera sincrónica (`await`) del envío de email | Envío desacoplado asíncrono con timeout de 10 s | **Cerrado** |
| **D-05** | Presupuestos / UI | Desincronización en porcentajes calculados en el cliente | Media | Duplicidad de fórmulas entre front y back | Cálculo centralizado en backend; cliente solo renderiza | **Cerrado** |
| **D-06** | Estadísticas / Notificaciones | Consultar estadísticas disparaba alertas en la base de datos | Alta | Función de consulta realizaba inserciones (Side Effect) | Refactorización CQS: función de cálculo pura | **Cerrado** |
| **D-07** | Movimientos | Gasto compartido se listaba erróneamente como individual | Alta | Falta de filtro de alcance en la consulta SQL | Inclusión de filtro estricto `alcance = 'personal'` | **Cerrado** |
| **D-08** | Gastos Compartidos | Selector de categoría por participante vacío por defecto | Baja | Inicialización indefinida en el componente Vue | Valor inicial por defecto asignado a cadena vacía | **Cerrado** |
| **D-09** | Interfaz Móvil | Barra de navegación inferior se desbordaba a 375 px | Media | Anchos fijos inadecuados para pantallas estrechas | Reestructuración de grilla 4x2 con botones de 44 px | **Cerrado** |
| **D-10** | API REST / Ruteo | IDs no válidos (no UUID) provocaban excepción 500 | Media | Inyección directa de parámetros en Sequelize | Middleware `validarIdParam` responde 404 limpio | **Cerrado** |
| **D-11** | Formularios | Fecha sugerida errónea después de las 21:00 hs en Argentina | Media | Empleo de fecha UTC en lugar de zona horaria local | Utilidad `hoyLocal()` para cálculo en UTC-3 | **Cerrado** |
| **D-12** | Metas de Ahorro | Al editar un movimiento, su aporte a la meta no cambiaba | Alta | Operaciones independientes sin transacción ACID | Actualización atómica en la misma transacción | **Cerrado** |
| **D-13** | Compras / Cuotas | Desbordamiento de 255 caracteres en la descripción | Media | Concatenación descontrolada de sufijos "(n/N)" | Límite máximo de 200 caracteres en descripción base | **Cerrado** |
| **D-14** | Sesión / Auth | La sesión caía forzosamente a los 15 minutos | Alta | El frontend no invocaba el endpoint de renovación | Interceptor Axios/Fetch para reintento ante 401 | **Cerrado** |
| **D-15** | Frontend / Ruteo | Enlace de restablecimiento de clave conducía a ruta 404 | Alta | Falta de declaración de vista en el router de Vue | Creación de ruta y vista `/restablecer` | **Cerrado** |
| **D-16** | Frontend / Movimientos | El doble clic en "Guardar" duplicaba transacciones | Alta | Falta de bloqueo de submit concurrente | Estado reactivo `enviando` y deshabilitación visual | **Cerrado** |

---

## 21. Seguimiento de Defectos

Para la gestión de incidencias se adoptó el ciclo de vida estándar de defectos:

```
[ Identificado ] ──> [ Asignado / Reproducido ] ──> [ Corregido ] ──> [ Prueba de Regresión ] ──> [ Cerrado ]
```

Cada ficha técnica de defecto incluyó: Identificador, fecha de hallazgo, descripción precisa, precondiciones y pasos para reproducir, resultado obtenido vs. esperado, evidencia gráfica/log, severidad, prioridad y confirmación de cierre mediante suite automatizada.

### 21.1 Defectos Menores Postergados (Minors Diferidos)
Aquellas observaciones de optimización que no comprometieron la integridad operativa fueron catalogadas y pospuestas formalmente:
* Implementación de límites de tasa (Rate Limiting) en endpoints públicos `/recuperar` y `/unirse`.
* Revocación explícita de Refresh Tokens en lista negra (Blacklisting en Redis).
* Paginación infinita ("Cargar más") en el histórico extenso de gastos compartidos (actualmente acotado a los últimos 100).
* Normalización insensitiva a mayúsculas en parámetros UUID en la URL.

---

## 22. Revisión de Artefactos No Código

Como parte de las actividades de verificación estática, se seleccionó el documento de instalación del sistema (**`docs/instalacion.md`**), el cual no existía al inicio y fue redactado como borrador técnico para luego ser auditado rigurosamente contra el código fuente del proyecto.

### 22.1 Proceso de Inspección
Se verificaron aspectos clave de la guía: URLs de clonado, variables de entorno requeridas en `backend/src/config/env.js`, puertos de escucha, scripts de ejecución en los archivos `package.json` y estado de las migraciones de Sequelize.

### 22.2 Hallazgos Registrados en la Revisión

| ID | Hallazgo en el Artefacto | Nivel de Riesgo | Acción Correctiva Implementada | Estado |
|---|---|---|---|---|
| **R-01** | Inexistencia de archivo plantilla con variables de entorno | Medio | Creación de `backend/.env.example` documentando cada clave requerida | **Corregido** |
| **R-02** | Declaración de Node 22 sin validación de versión mínima | Bajo | Ajuste de la guía documentando la versión probada (Node 25) | **Corregido en guía** |
| **R-03** | Omisión de aclaración sobre la exigencia de SSL/TLS en PostgreSQL | Alto | Incorporación de advertencia explícita en la sección de requisitos | **Corregido** |
| **R-04** | Riesgo de polución de la base principal al ejecutar pruebas | Alto | Inclusión de advertencia sobre la configuración de `DATABASE_URL` | **Corregido en guía** |
| **R-05** | Ausencia de procedimientos de contingencia ante fallas de red | Bajo | Adición de la sección estructurada "Solución de Problemas" | **Corregido** |

---

## 23. Resultados

A continuación se sintetiza el balance cuantitativo de las actividades de V&V desarrolladas sobre Platita:

```
========================================================================
                      RESUMEN CUANTITATIVO DE CALIDAD
========================================================================
  • Casos de prueba formales diseñados:             23 casos
  • Casos de prueba ejecutados manualmente:         17 casos (100 % completados)
  • Pruebas automatizadas de Backend (Jest):        263 pruebas (100 % exitosas)
  • Pruebas automatizadas de Frontend (Vitest):     105 pruebas (100 % exitosas)
  • Total de pruebas automatizadas en suite:        368 pruebas aprobadas
  • Pruebas de sistema sobre entorno integrado:     16 pruebas evaluadas
  • Defectos identificados y registrados:           16 defectos
  • Tasa de resolución y cierre de defectos:        100 % (16 / 16 cerrados)
  • Defectos no código detectados y subsanados:     5 hallazgos (3 corregidos, 2 doc.)
  • Estado de la compilación y despliegue:          Verificado y operativo (Netlify + servidor propio)
========================================================================
```

---

## 24. Conclusiones

El proyecto **Platita** ha demostrado satisfacer plenamente los objetivos funcionales, de seguridad y de experiencia de usuario planteados en su especificación original. La aplicación se encuentra actualmente implementada, probada de forma integral y desplegada en producción accesible vía web.

### 24.1 Respuesta a la Pregunta Fundamental de Validación
> **¿El sistema satisface las necesidades planteadas al comienzo del proyecto?**
> 
> **Sí, de forma concluyente.** La aplicación permite a los usuarios registrar sus operaciones de ingresos y gastos con certeza matemática de centavos, proyectar compromisos periódicos mediante gastos fijos, mantener control de presupuestos mediante alarmas oportunas y administrar economías familiares compartidas sin desbalances ni ambigüedades. Las pruebas automatizadas (368 pruebas) y las validaciones de sistema en navegadores móviles y de escritorio constituyen la evidencia fehaciente de su solidez operativa.

### 24.2 Principales Aprendizajes del Proceso de V&V
1. **La exactitud numérica no se negocia:** El tratamiento de dinero en aplicaciones web debe realizarse invariablemente mediante aritmética de enteros (centavos) en la capa de negocio, protegiendo las bases de datos con validaciones rigurosas en los valores límite superiores e inferiores.
2. **CQS y pureza en consultas:** Separar estrictamente las operaciones de lectura respecto de las de escritura evita efectos colaterales graves, como la emisión espuria de notificaciones al consultar reportes estadísticos.
3. **El aislamiento de datos como pilar de confianza:** En sistemas donde confluyen datos individuales y compartidos, las pruebas automáticas de aislamiento multitenant son el reaseguro indispensable para prevenir brechas de privacidad.
4. **La automatización acelera el desarrollo:** Disponer de una batería de pruebas de regresión que se ejecuta en escasos segundos brindó la confianza necesaria para acometer refactorizaciones de arquitectura profundas (como la sustitución de tarjetas por gastos fijos) con la certeza de no quebrar funcionalidades previas.

---

## 25. Bibliografía y Fuentes Consultadas

1. **Pressman, R. S., & Maxim, B. R.** (2020). *Software Engineering: A Practitioner's Approach* (9th ed.). McGraw-Hill Education.
2. **Sommerville, I.** (2016). *Software Engineering* (10th ed.). Pearson.
3. **International Software Testing Qualifications Board (ISTQB).** (2023). *Certified Tester Foundation Level (CTFL) Syllabus v4.0*.
4. **Vue.js Documentation.** (2026). *The Progressive JavaScript Framework*. https://vuejs.org/
5. **Express.js Documentation.** (2026). *Fast, unopinionated, minimalist web framework for Node.js*. https://expressjs.com/
6. **Sequelize ORM.** (2026). *Feature-rich ORM for modern TypeScript & JavaScript*. https://sequelize.org/
7. **Jest Testing Framework.** (2026). *Delightful JavaScript Testing*. https://jestjs.io/
8. **Vitest Documentation.** (2026). *Next Generation Testing Framework*. https://vitest.dev/
9. **PostgreSQL Global Development Group.** (2026). *PostgreSQL 16 Documentation*. https://www.postgresql.org/docs/
10. **Neon Documentation.** (2026). *Serverless Postgres Platform*. https://neon.tech/docs/
11. **Motion Documentation.** (2026). *A modern animation library for JavaScript and React/Vue*. https://motion.dev/
12. **Material didáctico y consignas de la materia:** *Verificación y Validación de Software*, Tercer Año TSDS, Universidad Provincial de Córdoba (UPC) – Sede Regional Las Varillas.