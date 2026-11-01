'use strict';

// Registra los pagos reales de cada persona en un gasto compartido.
// participaciones_gasto sigue guardando la parte teórica; aportes_gasto guarda
// quién puso la plata y cuándo, permitiendo varios aportes por persona.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('aportes_gasto', {
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
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('aportes_gasto', ['movimientoId']);
    await queryInterface.addIndex('aportes_gasto', ['usuarioId', 'fecha']);

    // Compatibilidad: los gastos viejos no tienen aportes. Se registra un aporte
    // del pagador histórico por el total, así los saldos actuales no cambian.
    await queryInterface.sequelize.query(
      `INSERT INTO aportes_gasto (id, "movimientoId", "usuarioId", monto, fecha, "createdAt", "updatedAt")
       SELECT gen_random_uuid(), m.id, COALESCE(m."pagadorId", m."usuarioId"), m.monto, m.fecha, NOW(), NOW()
       FROM movimientos m
       WHERE m.alcance = 'compartido'
         AND m.tipo = 'gasto'
         AND NOT EXISTS (SELECT 1 FROM aportes_gasto a WHERE a."movimientoId" = m.id)`
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('aportes_gasto');
  },
};
