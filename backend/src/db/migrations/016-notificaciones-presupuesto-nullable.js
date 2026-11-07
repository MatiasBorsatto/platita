'use strict';

// Las notificaciones de vencimiento no tienen presupuesto asociado.
// Corrige bases donde la migración 013 no pudo quitar el NOT NULL.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE notificaciones ALTER COLUMN "presupuestoId" DROP NOT NULL'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DELETE FROM notificaciones WHERE "presupuestoId" IS NULL'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE notificaciones ALTER COLUMN "presupuestoId" SET NOT NULL'
    );
  },
};
