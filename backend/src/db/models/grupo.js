const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const Grupo = sequelize.define(
  'Grupo',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    codigo: { type: DataTypes.STRING(16), allowNull: false, unique: true },
    creadoPor: { type: DataTypes.UUID, allowNull: false },
  },
  { tableName: 'grupos' }
);

module.exports = Grupo;
