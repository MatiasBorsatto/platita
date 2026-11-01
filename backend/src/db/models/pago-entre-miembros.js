const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const PagoEntreMiembros = sequelize.define(
  'PagoEntreMiembros',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    grupoId: { type: DataTypes.UUID, allowNull: false },
    deudorId: { type: DataTypes.UUID, allowNull: false },
    acreedorId: { type: DataTypes.UUID, allowNull: false },
    monto: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    nota: { type: DataTypes.STRING(255), allowNull: true },
  },
  { tableName: 'pagos_entre_miembros' }
);

module.exports = PagoEntreMiembros;
