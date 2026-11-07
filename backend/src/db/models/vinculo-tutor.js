const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

// Un tutor adulto de un menor dentro de un grupo familiar.
const VinculoTutor = sequelize.define(
  'VinculoTutor',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tutorId: { type: DataTypes.UUID, allowNull: false },
    menorId: { type: DataTypes.UUID, allowNull: false },
    grupoId: { type: DataTypes.UUID, allowNull: false },
  },
  { tableName: 'vinculos_tutor' }
);

module.exports = VinculoTutor;
