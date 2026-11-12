require('dotenv').config({ quiet: true });

// Las dos son obligatorias: sin ellas el servidor no arranca, en lugar de fallar en la primera consulta (B-06).
for (const variable of ['JWT_SECRET', 'DATABASE_URL']) {
  if (!process.env[variable]) throw new Error(`Falta la variable de entorno ${variable}`);
}

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: Number(process.env.PORT) || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV || 'development',
};
