'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invitaciones', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      grupoId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'grupos', key: 'id' },
        onDelete: 'CASCADE',
      },
      email: { type: Sequelize.STRING(254), allowNull: false },
      token: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      estado: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'pendiente' },
      expiraEn: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('invitaciones', ['grupoId', 'email']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('invitaciones');
  },
};
