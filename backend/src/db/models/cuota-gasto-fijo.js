const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const CuotaGastoFijo = sequelize.define(
  'CuotaGastoFijo',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    gastoFijoId: { type: DataTypes.UUID, allowNull: false },
    conceptoId: { type: DataTypes.UUID, allowNull: false },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    mes: { type: DataTypes.STRING(7), allowNull: false },
    monto: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    fechaVencimiento: { type: DataTypes.DATEONLY, allowNull: false },
    estado: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'pendiente' },
    pagadoEn: { type: DataTypes.DATE, allowNull: true },
    movimientoId: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: 'cuotas_gasto_fijo',
    indexes: [{ unique: true, fields: ['conceptoId', 'mes'] }],
  }
);

module.exports = CuotaGastoFijo;
