const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const AporteGasto = sequelize.define(
  'AporteGasto',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    movimientoId: { type: DataTypes.UUID, allowNull: false },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    monto: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
  },
  { tableName: 'aportes_gasto' }
);

module.exports = AporteGasto;
