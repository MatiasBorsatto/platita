'use strict';

// Reemplaza las tarjetas de crédito por gastos fijos con conceptos y cuotas.
// La migración es destructiva a propósito: borra tarjetas, compras y los
// movimientos de pago de resumen, que ya no forman parte del producto.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query("DELETE FROM movimientos WHERE tipo = 'pago_tarjeta'");
    await queryInterface.removeColumn('movimientos', 'compraId');
    await queryInterface.removeColumn('movimientos', 'tarjetaId');
    await queryInterface.dropTable('compras');
    await queryInterface.dropTable('tarjetas');

    await queryInterface.createTable('gastos_fijos', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      usuarioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      diaVencimiento: { type: Sequelize.INTEGER, allowNull: false },
      categoriaId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'categorias', key: 'id' },
        onDelete: 'SET NULL',
      },
      archivado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('gastos_fijos', ['usuarioId']);

    await queryInterface.createTable('conceptos_gasto_fijo', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      gastoFijoId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'gastos_fijos', key: 'id' },
        onDelete: 'CASCADE',
      },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      montoTotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      // null = concepto recurrente (todos los meses); un entero = cuotas finitas.
      cuotas: { type: Sequelize.INTEGER, allowNull: true },
      mesInicio: { type: Sequelize.STRING(7), allowNull: false },
      archivado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('conceptos_gasto_fijo', ['gastoFijoId']);

    await queryInterface.createTable('cuotas_gasto_fijo', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      gastoFijoId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'gastos_fijos', key: 'id' },
        onDelete: 'CASCADE',
      },
      conceptoId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'conceptos_gasto_fijo', key: 'id' },
        onDelete: 'CASCADE',
      },
      usuarioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      mes: { type: Sequelize.STRING(7), allowNull: false },
      monto: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      fechaVencimiento: { type: Sequelize.DATEONLY, allowNull: false },
      estado: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'pendiente' },
      pagadoEn: { type: Sequelize.DATE, allowNull: true },
      movimientoId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'movimientos', key: 'id' },
        onDelete: 'SET NULL',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('cuotas_gasto_fijo', ['conceptoId', 'mes'], { unique: true });
    await queryInterface.addIndex('cuotas_gasto_fijo', ['gastoFijoId']);
    await queryInterface.addIndex('cuotas_gasto_fijo', ['usuarioId']);
    await queryInterface.addIndex('cuotas_gasto_fijo', ['mes', 'estado']);

    await queryInterface.addColumn('movimientos', 'gastoFijoId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'gastos_fijos', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('movimientos', ['gastoFijoId']);

    await queryInterface.changeColumn('notificaciones', 'presupuestoId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'presupuestos', key: 'id' },
      onDelete: 'CASCADE',
    });
    // Sequelize no siempre elimina el NOT NULL al cambiar una columna con FK.
    await queryInterface.sequelize.query(
      'ALTER TABLE notificaciones ALTER COLUMN "presupuestoId" DROP NOT NULL'
    );
    await queryInterface.addColumn('notificaciones', 'cuotaGastoFijoId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'cuotas_gasto_fijo', key: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addColumn('notificaciones', 'tipo', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'presupuesto',
    });
    await queryInterface.changeColumn('notificaciones', 'alerta', {
      type: Sequelize.STRING(10),
      allowNull: false,
    });
    await queryInterface.removeIndex('notificaciones', 'notificaciones_presupuesto_alerta_unico');
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX notificaciones_presupuesto_alerta_uq ON notificaciones ("presupuestoId", alerta) WHERE "presupuestoId" IS NOT NULL'
    );
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX notificaciones_cuota_alerta_uq ON notificaciones ("cuotaGastoFijoId", alerta) WHERE "cuotaGastoFijoId" IS NOT NULL'
    );
    await queryInterface.addIndex('notificaciones', ['cuotaGastoFijoId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS notificaciones_cuota_alerta_uq');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS notificaciones_presupuesto_alerta_uq');
    await queryInterface.removeIndex('notificaciones', ['cuotaGastoFijoId']);
    await queryInterface.removeColumn('notificaciones', 'tipo');
    await queryInterface.removeColumn('notificaciones', 'cuotaGastoFijoId');
    await queryInterface.changeColumn('notificaciones', 'alerta', {
      type: Sequelize.STRING(3),
      allowNull: false,
    });
    await queryInterface.changeColumn('notificaciones', 'presupuestoId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'presupuestos', key: 'id' },
      onDelete: 'CASCADE',
    });
    await queryInterface.addIndex('notificaciones', ['presupuestoId', 'alerta'], {
      unique: true,
      name: 'notificaciones_presupuesto_alerta_unico',
    });

    await queryInterface.removeColumn('movimientos', 'gastoFijoId');
    await queryInterface.dropTable('cuotas_gasto_fijo');
    await queryInterface.dropTable('conceptos_gasto_fijo');
    await queryInterface.dropTable('gastos_fijos');

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
      descripcion: { type: Sequelize.STRING(255), allowNull: true },
      montoTotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      cuotas: { type: Sequelize.INTEGER, allowNull: false },
      modalidad: { type: Sequelize.STRING(15), allowNull: false },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('compras', ['usuarioId', 'tarjetaId']);
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
  },
};
