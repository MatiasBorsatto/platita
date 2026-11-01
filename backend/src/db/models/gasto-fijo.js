const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const GastoFijo = sequelize.define(
  'GastoFijo',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    usuarioId: { type: DataTypes.UUID, allowNull: false },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    diaVencimiento: { type: DataTypes.INTEGER, allowNull: false },
    categoriaId: { type: DataTypes.UUID, allowNull: true },
    archivado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: 'gastos_fijos' }
);

module.exports = GastoFijo;
