const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const MiembroGrupo = sequelize.define(
  'MiembroGrupo',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    grupoId: { type: DataTypes.UUID, allowNull: false },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    // STRING en la migración; el rol se valida en el modelo.
    rol: { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [['admin', 'miembro']] } },
  },
  {
    tableName: 'miembros_grupo',
    indexes: [{ unique: true, fields: ['grupoId', 'usuarioId'] }],
  }
);

module.exports = MiembroGrupo;
