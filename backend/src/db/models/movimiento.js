const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const Movimiento = sequelize.define(
  'Movimiento',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    tipo: { type: DataTypes.STRING(20), allowNull: false }, // ingreso | gasto | pago_tarjeta,
    alcance: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'personal' },
    // DECIMAL llega como string desde pg: nunca se convierte a float.
    monto: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    descripcion: { type: DataTypes.STRING(255), allowNull: true },
    categoriaId: { type: DataTypes.UUID, allowNull: true },
    tarjetaId: { type: DataTypes.UUID, allowNull: true },
    compraId: { type: DataTypes.UUID, allowNull: true },
    metaId: { type: DataTypes.UUID, allowNull: true },
    grupoId: { type: DataTypes.UUID, allowNull: true },
    pagadorId: { type: DataTypes.UUID, allowNull: true },
  },
  { tableName: 'movimientos' }
);

module.exports = Movimiento;
