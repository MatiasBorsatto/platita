const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const Compra = sequelize.define(
  'Compra',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    tarjetaId: { type: DataTypes.UUID, allowNull: false },
    // DECIMAL llega como string desde pg: nunca se convierte a float.
    montoTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    cuotas: { type: DataTypes.INTEGER, allowNull: false },
    modalidad: { type: DataTypes.STRING(15), allowNull: false },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
  },
  { tableName: 'compras' }
);

module.exports = Compra;
