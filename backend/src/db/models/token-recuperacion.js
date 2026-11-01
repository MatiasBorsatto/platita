const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const TokenRecuperacion = sequelize.define(
  'TokenRecuperacion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    tokenHash: { type: DataTypes.STRING, allowNull: false, unique: true },
    venceEn: { type: DataTypes.DATE, allowNull: false },
    usadoEn: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'tokens_recuperacion' }
);

module.exports = TokenRecuperacion;
