const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const ConceptoGastoFijo = sequelize.define(
  'ConceptoGastoFijo',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    gastoFijoId: { type: DataTypes.UUID, allowNull: false },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    montoTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    // null = recurrente todos los meses; entero = cantidad de cuotas.
    cuotas: { type: DataTypes.INTEGER, allowNull: true },
    mesInicio: { type: DataTypes.STRING(7), allowNull: false },
    archivado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: 'conceptos_gasto_fijo' }
);

module.exports = ConceptoGastoFijo;
