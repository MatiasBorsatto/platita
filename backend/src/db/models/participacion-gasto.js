const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const ParticipacionGasto = sequelize.define(
  'ParticipacionGasto',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    movimientoId: { type: DataTypes.UUID, allowNull: false },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    categoriaId: { type: DataTypes.UUID, allowNull: true },
    monto: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  },
  {
    tableName: 'participaciones_gasto',
    indexes: [{ unique: true, fields: ['movimientoId', 'usuarioId'] }],
  }
);

module.exports = ParticipacionGasto;
