const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const Notificacion = sequelize.define(
  'Notificacion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    tipo: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'presupuesto' },
    presupuestoId: { type: DataTypes.UUID, allowNull: true },
    cuotaGastoFijoId: { type: DataTypes.UUID, allowNull: true },
    alerta: { type: DataTypes.STRING(10), allowNull: false },
    mensaje: { type: DataTypes.STRING(300), allowNull: false },
    leida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: 'notificaciones' }
);

module.exports = Notificacion;
