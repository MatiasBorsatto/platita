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
    ambito: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'propio' },
    grupoId: { type: DataTypes.UUID, allowNull: true },
    tipoPago: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'simple' },
    tarjetaTipo: { type: DataTypes.STRING(10), allowNull: true },
    ultimosCuatro: { type: DataTypes.CHAR(4), allowNull: true },
    banco: { type: DataTypes.STRING(60), allowNull: true },
    titular: { type: DataTypes.STRING(100), allowNull: true },
    alias: { type: DataTypes.STRING(60), allowNull: true },
    moneda: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: 'ARS' },
  },
  { tableName: 'gastos_fijos' }
);

module.exports = GastoFijo;
