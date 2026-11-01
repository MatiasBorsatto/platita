'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('metas', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      usuarioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      // null = meta personal. Se usa para metas grupales más adelante (sin FK hasta que exista grupos).
      grupoId: { type: Sequelize.UUID, allowNull: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      montoObjetivo: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      fechaLimite: { type: Sequelize.DATEONLY, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('metas', ['usuarioId']);

    await queryInterface.createTable('aportes_meta', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      metaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'metas', key: 'id' },
        onDelete: 'CASCADE',
      },
      // Negativo = retiro.
      monto: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      movimientoId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'movimientos', key: 'id' },
        onDelete: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('aportes_meta', ['metaId']);
    await queryInterface.addIndex('aportes_meta', ['movimientoId']);

    await queryInterface.addColumn('movimientos', 'metaId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'metas', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('movimientos', ['metaId']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('movimientos', 'metaId');
    await queryInterface.dropTable('aportes_meta');
    await queryInterface.dropTable('metas');
  },
};
