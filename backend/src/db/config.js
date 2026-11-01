require('dotenv').config({ quiet: true });
const { dialectOptions } = require('./ssl');

const base = { use_env_variable: 'DATABASE_URL', dialect: 'postgres', dialectOptions };

module.exports = { development: base, test: base, production: base };
