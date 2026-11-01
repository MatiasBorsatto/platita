const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const Meta = sequelize.define(
  'Meta',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    grupoId: { type: DataTypes.UUID, allowNull: true }, // null = personal
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    // DECIMAL llega como string desde pg: nunca se convierte a float.
    montoObjetivo: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    fechaLimite: { type: DataTypes.DATEONLY, allowNull: true },
  },
  { tableName: 'metas' }
);

module.exports = Meta;
