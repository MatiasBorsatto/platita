'use strict';

// Moneda en metas y en pagos entre miembros. Por defecto ARS: los datos existentes siguen siendo en pesos.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('metas', 'moneda', { type: Sequelize.CHAR(3), allowNull: false, defaultValue: 'ARS' });
    await queryInterface.addColumn('pagos_entre_miembros', 'moneda', { type: Sequelize.CHAR(3), allowNull: false, defaultValue: 'ARS' });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('pagos_entre_miembros', 'moneda');
    await queryInterface.removeColumn('metas', 'moneda');
  },
};
