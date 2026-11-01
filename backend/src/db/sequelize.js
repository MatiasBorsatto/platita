require('dotenv').config({ quiet: true });
const { Sequelize } = require('sequelize');
const { dialectOptions } = require('./ssl');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions,
});

module.exports = { sequelize };
