'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('movimientos', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      usuarioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      tipo: { type: Sequelize.STRING(10), allowNull: false },
      alcance: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'personal' },
      monto: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      descripcion: { type: Sequelize.STRING(255), allowNull: true },
      categoriaId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'categorias', key: 'id' },
        onDelete: 'SET NULL',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('movimientos', ['usuarioId', 'fecha']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('movimientos');
  },
};
