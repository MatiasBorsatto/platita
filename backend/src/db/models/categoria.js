const { DataTypes } = require('sequelize');
const { sequelize } = require('../sequelize');

const Categoria = sequelize.define(
  'Categoria',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nombre: { type: DataTypes.STRING, allowNull: false },
    usuarioId: { type: DataTypes.UUID, allowNull: true },
    archivada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: 'categorias' }
);

module.exports = Categoria;
