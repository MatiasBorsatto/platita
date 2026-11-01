const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const AporteMeta = sequelize.define(
  'AporteMeta',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    metaId: { type: DataTypes.UUID, allowNull: false },
    monto: { type: DataTypes.DECIMAL(12, 2), allowNull: false }, // negativo = retiro
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    movimientoId: { type: DataTypes.UUID, allowNull: true },
  },
  { tableName: 'aportes_meta' }
);

module.exports = AporteMeta;
