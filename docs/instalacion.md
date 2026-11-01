# Instalación de Platita

Esta guía es para levantar la aplicación en tu computadora. Lo que sigue usa Windows con Git Bash o PowerShell.

## Requisitos

- Node.js. El proyecto se probó con la versión 25; la versión mínima no está verificada.
- Git.
- Una base PostgreSQL con conexión TLS. El proyecto usa Neon. Un PostgreSQL local sin SSL no funciona, porque la conexión exige TLS.

## 1. Obtener el código

```bash
git clone https://github.com/MatiasBorsatto/finanzas-jaki.git
cd finanzas-jaki
```

## 2. Configurar el backend

Copiar `backend/.env.example` a `backend/.env` y completar los valores:

```bash
DATABASE_URL=postgresql://usuario:clave@host/base?sslmode=require
JWT_SECRET=una-cadena-larga-y-aleatoria
```

Opcionales, para funciones que dependen de servicios externos:

```bash
GOOGLE_CLIENT_ID=tu-id-de-cliente.apps.googleusercontent.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=contraseña-de-aplicación
EMAIL_FROM=Platita <tu-correo@gmail.com>
FRONTEND_URL=http://localhost:5173
PORT=3000
```

Instalar dependencias y aplicar las migraciones:

```bash
cd backend
npm install
npx sequelize-cli db:migrate
```

## 3. Configurar el frontend

```bash
cd ../frontend
npm install
```

## 4. Ejecutar

En una terminal, el backend (puerto 3000):

```bash
cd backend
npm start
```

En otra terminal, el frontend (puerto 5173):

```bash
cd frontend
npm run dev
```

Abrir `http://localhost:5173` en el navegador y registrarse.

## 5. Ejecutar las pruebas

```bash
cd backend
npm test

cd ../frontend
npm test
```

Las pruebas de backend usan la base definida en `DATABASE_URL` y crean y borran usuarios de prueba. Conviene usar una base de desarrollo, no la de producción.

## Solución de problemas

- **"Falta la variable de entorno JWT_SECRET":** el archivo `.env` no existe o no está en `backend/`.
- **Errores de conexión a la base:** revisar que `DATABASE_URL` tenga `sslmode=require`.
- **El frontend no recibe datos:** el backend tiene que estar corriendo en el puerto 3000.
