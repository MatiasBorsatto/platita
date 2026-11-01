const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const Invitacion = sequelize.define(
  'Invitacion',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    grupoId: { type: DataTypes.UUID, allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: false },
    // Hash SHA-256 (hex) del token; el token en claro solo viaja por email.
    token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    estado: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'pendiente',
      validate: { isIn: [['pendiente', 'aceptada', 'cancelada', 'expirada']] },
    },
    expiraEn: { type: DataTypes.DATE, allowNull: false },
  },
  { tableName: 'invitaciones' }
);

module.exports = Invitacion;
