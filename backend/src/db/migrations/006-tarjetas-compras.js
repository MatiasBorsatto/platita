'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tarjetas', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      usuarioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      nombre: { type: Sequelize.STRING(60), allowNull: false },
      diaCierre: { type: Sequelize.INTEGER, allowNull: false },
      diaVencimiento: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tarjetas', ['usuarioId']);

    await queryInterface.createTable('compras', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      usuarioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      tarjetaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tarjetas', key: 'id' },
        onDelete: 'CASCADE',
      },
      montoTotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      cuotas: { type: Sequelize.INTEGER, allowNull: false },
      modalidad: { type: Sequelize.STRING(15), allowNull: false },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('compras', ['usuarioId', 'tarjetaId']);

    // pago_tarjeta tiene 12 caracteres y no entra en STRING(10).
    await queryInterface.changeColumn('movimientos', 'tipo', {
      type: Sequelize.STRING(20),
      allowNull: false,
    });
    await queryInterface.addColumn('movimientos', 'tarjetaId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'tarjetas', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('movimientos', 'compraId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'compras', key: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addIndex('movimientos', ['compraId']);
    await queryInterface.addIndex('movimientos', ['tarjetaId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('movimientos', 'compraId');
    await queryInterface.removeColumn('movimientos', 'tarjetaId');
    await queryInterface.changeColumn('movimientos', 'tipo', {
      type: Sequelize.STRING(10),
      allowNull: false,
    });
    await queryInterface.dropTable('compras');
    await queryInterface.dropTable('tarjetas');
  },
};
