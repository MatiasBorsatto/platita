'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pagos_entre_miembros', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      grupoId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'grupos', key: 'id' },
        onDelete: 'CASCADE',
      },
      deudorId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      acreedorId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      monto: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      nota: { type: Sequelize.STRING(255), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('pagos_entre_miembros', ['grupoId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pagos_entre_miembros');
  },
};
