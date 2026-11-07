const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

// Un permiso concreto que un tutor concede o retira a un menor. La lista válida vive en el backend.
const PermisoMenor = sequelize.define(
  'PermisoMenor',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    vinculoId: { type: DataTypes.UUID, allowNull: false },
    permiso: { type: DataTypes.STRING(60), allowNull: false },
    permitido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: 'permisos_menor' }
);

module.exports = PermisoMenor;
