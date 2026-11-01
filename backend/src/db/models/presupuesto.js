const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const Presupuesto = sequelize.define(
  'Presupuesto',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    categoriaId: { type: DataTypes.UUID, allowNull: false },
    mes: { type: DataTypes.STRING(7), allowNull: false },
    // DECIMAL llega como string desde pg: nunca se convierte a float.
    montoLimite: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    regla: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'solo_personal' },
  },
  {
    tableName: 'presupuestos',
    indexes: [{ unique: true, fields: ['usuarioId', 'categoriaId', 'mes'] }],
  }
);

module.exports = Presupuesto;
