'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('participaciones_gasto', 'categoriaId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'categorias', key: 'id' },
      onDelete: 'SET NULL',
    });
    // Las filas existentes heredan la categoría de su movimiento.
    await queryInterface.sequelize.query(
      'UPDATE participaciones_gasto p SET "categoriaId" = m."categoriaId" FROM movimientos m WHERE m.id = p."movimientoId"'
    );
    await queryInterface.addIndex('participaciones_gasto', ['categoriaId']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('participaciones_gasto', 'categoriaId');
  },
};
