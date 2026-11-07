'use strict';

// Un presupuesto por categoría, mes y moneda. Reemplaza el índice que no contemplaba la moneda.
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeIndex('presupuestos', 'presupuestos_usuario_categoria_mes_unico');
    await queryInterface.addIndex('presupuestos', ['usuarioId', 'categoriaId', 'mes', 'moneda'], {
      unique: true,
      name: 'presupuestos_usuario_categoria_mes_moneda_unico',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('presupuestos', 'presupuestos_usuario_categoria_mes_moneda_unico');
    await queryInterface.addIndex('presupuestos', ['usuarioId', 'categoriaId', 'mes'], {
      unique: true,
      name: 'presupuestos_usuario_categoria_mes_unico',
    });
  },
};
