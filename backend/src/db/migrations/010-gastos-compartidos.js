'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('movimientos', 'grupoId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'grupos', key: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addColumn('movimientos', 'pagadorId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'usuarios', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('movimientos', ['grupoId']);

    await queryInterface.createTable('participaciones_gasto', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      movimientoId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'movimientos', key: 'id' },
        onDelete: 'CASCADE',
      },
      usuarioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      monto: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('participaciones_gasto', ['movimientoId', 'usuarioId'], { unique: true });
    await queryInterface.addIndex('participaciones_gasto', ['usuarioId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('participaciones_gasto');
    await queryInterface.removeColumn('movimientos', 'pagadorId');
    await queryInterface.removeColumn('movimientos', 'grupoId');
  },
};
