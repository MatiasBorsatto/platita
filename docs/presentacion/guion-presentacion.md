# Guion de la presentación: Platita

**Materia:** Verificación y Validación de Software — TSDS, 3er año, UPC Sede Las Varillas
**Presentan:** Matías Borsatto y Tomás Agustín Gudiño Rubiolo
**Duración:** 10 minutos como máximo (preguntas aparte)
**Diapositivas:** [`diapositivas.html`](diapositivas.html) — 10 diapositivas, una por bloque. Se avanza con → o espacio y se retrocede con ←.

El texto está pensado para decirlo con las propias palabras. Cada bloque tiene su tiempo: ensayarlo con cronómetro.

## Mapa del tiempo

| Min | Diapositiva | Habla | Duración |
|---|---|---|---|
| 0:00 | 1. Portada | Matías | 20 s |
| 0:20 | 2. El problema | Matías | 50 s |
| 1:10 | 3. Qué resuelve | Tomás | 50 s |
| 2:00 | 4. Arquitectura | Matías | 50 s |
| 2:50 | 5. Cambio pedido: menores y control parental | Matías | 1 min 20 s |
| 4:10 | 6. Cambio pedido: tarjetas y multimoneda | Tomás | 1 min |
| 5:10 | 7. Cambio pedido: velocidad | Tomás | 50 s |
| 6:00 | 8. Demo en vivo | Matías y Tomás | 2 min 30 s |
| 8:30 | 9. Verificación y validación | Matías y Tomás | 1 min |
| 9:30 | 10. Conclusión | Matías | 30 s |

---

## 1. Portada — 0:00 · MATÍAS (20 s)

> Buenas. Somos Matías Borsatto y Tomás Gudiño Rubiolo, y les presentamos **Platita**: una aplicación web para ordenar la plata personal y la de la familia. Vamos a contar qué resuelve, los cambios que nos pidió la profe, y cómo probamos que funciona.

---

## 2. El problema — 0:20 · MATÍAS (50 s)

> Casi todos llevan sus gastos en una planilla, o no los llevan. Las planillas fallan en cuatro cosas:
> - Cargar un gasto desde el celular es incómodo, así que no se anota.
> - Redondean mal: 0,10 más 0,20 da 0,30000000000000004.
> - Mezclan lo mío con lo de la casa.
> - El "quién le debe a quién" se calcula a mano.
>
> Y en una familia hay algo más: **los chicos**. Que aprendan a manejar plata, pero sin acceso a todo.

---

## 3. Qué resuelve — 1:10 · TOMÁS (50 s)

> Platita junta todo en un lugar, exacto al centavo:
> - **Movimientos:** ingresos y gastos, y cuánto tenés hoy.
> - **Presupuestos:** avisan al 80 % y al pasarte.
> - **Gastos fijos y deudas:** alquiler, servicios y cuotas.
> - **Metas:** ahorro.
> - **Grupos:** gastos compartidos y quién le debe a quién.
> - **Estadísticas:** en qué se va la plata.
> - **Control parental:** qué puede hacer cada menor.
>
> Y no hace falta manual: la primera vez, un recorrido guiado muestra todo.

---

## 4. Arquitectura — 2:00 · MATÍAS (50 s)

> Tres capas:
> - **Frontend:** Vue 3 en Netlify.
> - **Backend:** Node con Express 5, en nuestro servidor, publicado con ngrok.
> - **Datos:** PostgreSQL en Neon, con 19 migraciones reversibles.
>
> Dos decisiones sostienen todo:
> 1. **El dinero se maneja en centavos, como enteros**, así que no hay errores de redondeo.
> 2. **La seguridad se decide en el servidor:**
>    - cookies que JavaScript no puede leer;
>    - contraseñas con bcrypt;
>    - cada consulta filtrada por usuario.

---

## 5. Cambio pedido: menores y control parental — 2:50 · MATÍAS (1 min 20 s)

> El primer pedido de la profe fue que la app sirviera para familias con hijos.
>
> **La edad no se guarda, se calcula** desde la fecha de nacimiento en cada pedido. Al cumplir 18, la persona pasa a adulto sola.
>
> **El adulto decide permiso por permiso:**
> - vincula al menor en un grupo familiar;
> - elige qué puede ver y hacer;
> - cada cambio queda en un registro de auditoría.
>
> **Reglas fijas:**
> - Un menor sin tutor solo usa sus funciones personales.
> - Las tarjetas, nunca.
> - El menor no puede cambiar sus propios permisos.
>
> Lo importante para V&V: todo se valida **en el servidor**. Si un menor fuerza un pedido directo a la API, recibe **403 Prohibido**. Lo cubren 15 pruebas de autorización y 11 de control parental.

---

## 6. Cambio pedido: tarjetas y multimoneda — 4:10 · TOMÁS (1 min)

> El segundo pedido fue sumar **tarjetas** a los gastos fijos.
> - Guardamos solo lo que no es sensible: tipo, últimos 4 dígitos, banco, titular y alias.
> - El número completo, el código de seguridad y el PIN **nunca** se guardan. Si alguien los manda a la API, se rechazan.
> - Los 4 dígitos se validan dos veces: en la API y en la propia base de datos.
>
> El tercero fue **multimoneda**: pesos y dólares en movimientos, presupuestos, metas y gastos fijos. **No convertimos**: inventar un tipo de cambio daría totales falsos. Cada moneda se suma por separado.

---

## 7. Cambio pedido: velocidad — 5:10 · TOMÁS (50 s)

> El cuarto pedido fue velocidad. Primero medimos y encontramos dos cuellos de botella:
> - **Estadísticas de 24 meses:** hacían 48 consultas. Ahora hacen **2**.
> - **Presupuestos:** dos consultas por presupuesto. Ahora son **2 en total**.
>
> Para saber que no cambió ningún resultado, una prueba compara la versión optimizada contra la original, mes a mes.
>
> Además sumamos paginación, 36 índices en la base y pantallas de carga. Las consultas responden en menos de 200 milisegundos.

---

## 8. Demo en vivo — 6:00 · MATÍAS y TOMÁS (2 min 30 s)

**Preparar antes:** sesión abierta con la cuenta adulta (con datos cargados) y, en otra ventana, la cuenta del menor.

### MATÍAS — uso personal (6:00, 1 min 15 s)

| Paso | Acción | Qué decir |
|---|---|---|
| 1 | **Movimientos**: cargar `30000` y tocar **Guardar** dos veces rápido | "Se formatea mientras escribo, y el doble clic guarda una sola vez." |
| 2 | **Presupuestos**: una barra cerca del tope | "Amarilla al 80 %, roja al pasarse, y llega un aviso." |
| 3 | **Gastos fijos**: uno con tarjeta y **Pagar** | "Solo los últimos 4 dígitos. Al pagar, se anota solo." |

### TOMÁS — uso familiar (7:15, 1 min 15 s)

| Paso | Acción | Qué decir |
|---|---|---|
| 1 | **Grupos**: gasto de `$100` entre 3 y ver saldos | "33,34 + 33,33 + 33,33: no se pierde ni un centavo, y la app dice quién le debe a quién." |
| 2 | **Control parental**: activar un permiso | "Cada cambio queda registrado. Las tarjetas aparecen bloqueadas: no se pueden activar." |
| 3 | Ventana del menor: entrar a algo no habilitado | "El servidor lo rechaza. No depende de esconder un botón." |

> Si algo tarda, la base se está despertando. Decirlo con naturalidad y seguir.

---

## 9. Verificación y validación — 8:30 · MATÍAS y TOMÁS (1 min)

### MATÍAS (8:30, 30 s)

> Diseñamos **23 casos formales** con clases de equivalencia y valores límite. Así apareció un defecto real: un monto de 11 dígitos rompía la base con error 500. Lo corregimos con **TDD**:
> 1. Primero la prueba que fallaba.
> 2. Después la corrección.
> 3. Al final, la suite completa sin regresiones.

### TOMÁS (9:00, 30 s)

> Hoy hay **349 pruebas automatizadas**, todas aprobadas:
> - 250 de backend, contra una base real;
> - 99 de frontend.
>
> Registramos y cerramos 16 defectos. Ninguna corrección entra sin correr todo. Eso nos dejó hacer los cambios que pidió la profe sin romper lo anterior.

---

## 10. Conclusión — 9:30 · MATÍAS (30 s)

> ¿El sistema satisface las necesidades planteadas? **Sí, en lo principal**:
> - plata exacta al centavo;
> - presupuestos que avisan;
> - gastos en familia sin desbalances;
> - menores con permisos que controla un adulto.
>
> Nos llevamos una idea: **la confianza en un sistema que maneja plata no se declara, se prueba.** Gracias. ¿Preguntas?

---

## Plan B si falla la demo

1. **Si la API no responde**, abrir `https://touched-woodcock-upright.ngrok-free.app/api/health`. Si no devuelve `{"estado":"ok"}`, el servidor está apagado o sin internet. Seguir con capturas preparadas antes.
2. **Si falla un módulo**, saltearlo y seguir. No improvisar arreglos en vivo.

## Checklist del día

- [ ] Prender el servidor 10 minutos antes. Arranca solo el backend y ngrok.
- [ ] `https://touched-woodcock-upright.ngrok-free.app/api/health` devuelve `{"estado":"ok"}`.
- [ ] Cuentas de demo preparadas:
  - un adulto con movimientos, un presupuesto cerca del tope y un gasto fijo con tarjeta;
  - un grupo con dos adultos y un menor vinculado;
  - la sesión del menor abierta en otra ventana.
- [ ] **Perfil > Animaciones**: "Activadas".
- [ ] `diapositivas.html` abierto en pantalla completa (F).
- [ ] Usar la app 5 minutos antes, para despertar la base.
- [ ] Ensayar con cronómetro: 10 minutos como máximo.

## Preguntas probables

| # | Pregunta | Respuesta sugerida | Contesta |
|---|---|---|---|
| 1 | ¿Por qué centavos? | Con coma flotante, 0,10 no es exacto. En centavos enteros, la suma es exacta. | Matías |
| 2 | ¿Y si un menor manipula la pantalla? | El permiso se decide en el servidor. Si fuerza la API, recibe 403. Hay pruebas que lo intentan. | Matías |
| 3 | ¿Qué pasa al cumplir 18? | La edad se calcula en cada pedido. Pasa a adulto solo. | Matías |
| 4 | ¿Por qué no guardan el número de tarjeta? | No hace falta para identificar con qué se paga, y guardarlo sería un riesgo. Solo se guardan los últimos 4 dígitos, validados en la API y en la base. | Tomás |
| 5 | ¿Por qué no convierten dólares a pesos? | Un tipo de cambio inventado daría totales falsos. | Tomás |
| 6 | ¿Cómo saben que optimizar no cambió resultados? | Una prueba compara la versión optimizada con la original, mes a mes. | Tomás |
| 7 | ¿Diferencia entre verificación y validación? | Verificar es ver si lo construimos bien: pruebas unitarias, de integración y de caja blanca. Validar es ver si construimos lo correcto: pruebas de sistema y necesidades del usuario. | Matías |
| 8 | ¿Qué quedó pendiente? | El envío de emails en un entorno real, el límite de pedidos en endpoints públicos y la revocación de tokens. | Tomás |
