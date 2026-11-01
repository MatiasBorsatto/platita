const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const Notificacion = sequelize.define(
  'Notificacion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    presupuestoId: { type: DataTypes.UUID, allowNull: false },
    alerta: { type: DataTypes.STRING(3), allowNull: false },
    mensaje: { type: DataTypes.STRING(300), allowNull: false },
    leida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: 'notificaciones',
    indexes: [{ unique: true, fields: ['presupuestoId', 'alerta'] }],
  }
);

module.exports = Notificacion;
