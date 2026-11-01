'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notificaciones', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      usuarioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      presupuestoId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'presupuestos', key: 'id' },
        onDelete: 'CASCADE',
      },
      alerta: { type: Sequelize.STRING(3), allowNull: false },
      mensaje: { type: Sequelize.STRING(300), allowNull: false },
      leida: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('notificaciones', ['presupuestoId', 'alerta'], {
      unique: true,
      name: 'notificaciones_presupuesto_alerta_unico',
    });
    await queryInterface.addIndex('notificaciones', ['usuarioId', 'leida']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notificaciones');
  },
};
