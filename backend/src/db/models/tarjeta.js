const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const Tarjeta = sequelize.define(
  'Tarjeta',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    diaCierre: { type: DataTypes.INTEGER, allowNull: false },
    diaVencimiento: { type: DataTypes.INTEGER, allowNull: false },
  },
  { tableName: 'tarjetas' }
);

module.exports = Tarjeta;
