const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

// Quién hizo qué sobre qué entidad. El detalle nunca incluye contraseñas ni datos bancarios completos.
const RegistroAuditoria = sequelize.define(
  'RegistroAuditoria',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    accion: { type: DataTypes.STRING(60), allowNull: false },
    entidad: { type: DataTypes.STRING(60), allowNull: false },
    entidadId: { type: DataTypes.UUID, allowNull: true },
    detalle: { type: DataTypes.JSONB, allowNull: true },
    creadoEn: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { tableName: 'registro_auditoria', timestamps: false }
);

module.exports = RegistroAuditoria;
