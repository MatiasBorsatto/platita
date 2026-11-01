'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('presupuestos', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      usuarioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      categoriaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'categorias', key: 'id' },
        onDelete: 'CASCADE',
      },
      mes: { type: Sequelize.STRING(7), allowNull: false },
      montoLimite: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      regla: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'solo_personal' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('presupuestos', ['usuarioId', 'categoriaId', 'mes'], {
      unique: true,
      name: 'presupuestos_usuario_categoria_mes_unico',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('presupuestos');
  },
};
