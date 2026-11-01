# Revisión de un artefacto no código: instrucciones de instalación

Responsable: Tomas Agustin Gudiño Rubiolo. Artefacto revisado: `docs/instalacion.md`, escrito como borrador y revisado contra el código del proyecto. Fecha: 30/10/2026.

El proyecto no tenía instrucciones de instalación. El borrador se escribió primero y después se revisó.

## Verificaciones realizadas

| Punto de la guía | Cómo se verificó | Resultado |
|---|---|---|
| URL de clonado | Comparada con el repositorio público en GitHub | Correcta |
| Variables obligatorias `DATABASE_URL` y `JWT_SECRET` | Leídas en `backend/src/config/env.js` | Correctas. El mensaje de error coincide con el del código |
| Variables opcionales de SMTP | Leídas en `backend/src/services/email.js` | Correctas |
| Puerto 3000 del backend | `backend/src/config/env.js` y `frontend/vite.config.js` | Coinciden |
| Comando `npx sequelize-cli db:migrate` | Ejecutado `db:migrate:status` sobre la base del proyecto | Funciona. Las 12 migraciones figuran como aplicadas |
| Scripts `npm start`, `npm run dev`, `npm test` | Leídos en los `package.json` | Existen con esos nombres |

Limitación: la guía no se ejecutó de principio a fin en una computadora limpia. Las verificaciones son de lectura del código y de la base del proyecto.

## Problemas encontrados

| ID | Problema | Severidad | Corrección | Estado |
|---|---|---|---|---|
| R-01 | No existía un archivo de ejemplo de variables de entorno. Cada persona debía adivinar los nombres. | Media | Se creó `backend/.env.example` con todas las variables, sin valores reales. | Corregido |
| R-02 | La guía pedía Node.js 22 sin haberlo probado. El proyecto no declara una versión mínima en `package.json`. | Baja | La guía indica que se probó con la versión 25 y que la mínima no está verificada. | Parcial. Falta declarar `engines` en `package.json` |
| R-03 | Un PostgreSQL local sin SSL no funciona, porque la conexión exige TLS. La guía no lo decía. | Alta | Se aclara en los requisitos. | Corregido en la guía. El código sigue exigiendo TLS, a propósito |
| R-04 | Las pruebas de backend crean y borran usuarios en la base indicada por `DATABASE_URL`. Si se apunta a la base de producción, quedan datos de prueba. | Alta | Se agregó una advertencia en la guía. | Parcial. Falta una base de pruebas separada |
| R-05 | La guía no decía qué hacer si el frontend no recibe datos. | Baja | Se agregó la sección "Solución de problemas". | Corregido |

## Conclusión

La guía quedó con cinco problemas, dos de severidad alta. Tres se corrigieron en el documento o en el repositorio. Dos quedan parcialmente resueltos, y las acciones que faltan son declarar la versión de Node y separar la base de pruebas.
