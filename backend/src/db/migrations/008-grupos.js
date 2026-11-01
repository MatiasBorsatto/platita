'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('grupos', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      codigo: { type: Sequelize.STRING(16), allowNull: false, unique: true },
      creadoPor: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('miembros_grupo', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      grupoId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'grupos', key: 'id' },
        onDelete: 'CASCADE',
      },
      usuarioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      rol: { type: Sequelize.STRING(10), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('miembros_grupo', ['grupoId', 'usuarioId'], { unique: true });
    await queryInterface.addIndex('miembros_grupo', ['usuarioId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('miembros_grupo');
    await queryInterface.dropTable('grupos');
  },
};
