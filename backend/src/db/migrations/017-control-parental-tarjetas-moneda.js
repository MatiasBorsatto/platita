'use strict';

// Aditiva y sin pérdida de datos:
// - usuarios.fechaNacimiento (nullable: los usuarios existentes la cargan al próximo inicio de sesión).
// - vínculo tutor-menor y permisos por menor, con auditoría de cambios.
// - gastos fijos: ámbito (propio o grupo), tipo de pago (simple o tarjeta) y datos no sensibles de la tarjeta.
// - moneda (ARS por defecto) en gastos fijos, movimientos y presupuestos.
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, STRING, CHAR, JSONB, DATEONLY, DATE: TIMESTAMP, BOOLEAN } = Sequelize;
    await queryInterface.addColumn('usuarios', 'fechaNacimiento', { type: DATEONLY, allowNull: true });

    await queryInterface.createTable('vinculos_tutor', {
      id: { type: UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      tutorId: { type: UUID, allowNull: false, references: { model: 'usuarios', key: 'id' }, onDelete: 'CASCADE' },
      menorId: { type: UUID, allowNull: false, references: { model: 'usuarios', key: 'id' }, onDelete: 'CASCADE' },
      grupoId: { type: UUID, allowNull: false, references: { model: 'grupos', key: 'id' }, onDelete: 'CASCADE' },
      createdAt: { type: TIMESTAMP, allowNull: false, defaultValue: Sequelize.literal('now()') },
      updatedAt: { type: TIMESTAMP, allowNull: false, defaultValue: Sequelize.literal('now()') },
    });
    await queryInterface.addConstraint('vinculos_tutor', {
      fields: ['tutorId', 'menorId'], type: 'unique', name: 'vinculos_tutor_unico',
    });
    await queryInterface.sequelize.query(
      'ALTER TABLE vinculos_tutor ADD CONSTRAINT vinculos_tutor_no_propio CHECK ("tutorId" <> "menorId")'
    );

    await queryInterface.createTable('permisos_menor', {
      id: { type: UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      vinculoId: { type: UUID, allowNull: false, references: { model: 'vinculos_tutor', key: 'id' }, onDelete: 'CASCADE' },
      permiso: { type: STRING(60), allowNull: false },
      permitido: { type: BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: TIMESTAMP, allowNull: false, defaultValue: Sequelize.literal('now()') },
      updatedAt: { type: TIMESTAMP, allowNull: false, defaultValue: Sequelize.literal('now()') },
    });
    await queryInterface.addConstraint('permisos_menor', {
      fields: ['vinculoId', 'permiso'], type: 'unique', name: 'permisos_menor_unico',
    });

    await queryInterface.createTable('registro_auditoria', {
      id: { type: UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      usuarioId: { type: UUID, allowNull: false, references: { model: 'usuarios', key: 'id' }, onDelete: 'CASCADE' },
      accion: { type: STRING(60), allowNull: false },
      entidad: { type: STRING(60), allowNull: false },
      entidadId: { type: UUID, allowNull: true },
      detalle: { type: JSONB, allowNull: true },
      creadoEn: { type: TIMESTAMP, allowNull: false, defaultValue: Sequelize.literal('now()') },
    });
    await queryInterface.addIndex('registro_auditoria', ['usuarioId', 'creadoEn']);

    await queryInterface.addColumn('gastos_fijos', 'ambito', { type: STRING(10), allowNull: false, defaultValue: 'propio' });
    await queryInterface.addColumn('gastos_fijos', 'grupoId', { type: UUID, allowNull: true, references: { model: 'grupos', key: 'id' }, onDelete: 'CASCADE' });
    await queryInterface.addColumn('gastos_fijos', 'tipoPago', { type: STRING(20), allowNull: false, defaultValue: 'simple' });
    await queryInterface.addColumn('gastos_fijos', 'tarjetaTipo', { type: STRING(10), allowNull: true });
    await queryInterface.addColumn('gastos_fijos', 'ultimosCuatro', { type: CHAR(4), allowNull: true });
    await queryInterface.addColumn('gastos_fijos', 'banco', { type: STRING(60), allowNull: true });
    await queryInterface.addColumn('gastos_fijos', 'titular', { type: STRING(100), allowNull: true });
    await queryInterface.addColumn('gastos_fijos', 'alias', { type: STRING(60), allowNull: true });
    await queryInterface.sequelize.query(
      `ALTER TABLE gastos_fijos ADD CONSTRAINT gastos_fijos_ultimos_cuatro CHECK ("ultimosCuatro" IS NULL OR "ultimosCuatro" ~ '^[0-9]{4}$')`
    );

    for (const tabla of ['gastos_fijos', 'movimientos', 'presupuestos']) {
      await queryInterface.addColumn(tabla, 'moneda', { type: CHAR(3), allowNull: false, defaultValue: 'ARS' });
    }
  },

  async down(queryInterface) {
    for (const tabla of ['presupuestos', 'movimientos', 'gastos_fijos']) {
      await queryInterface.removeColumn(tabla, 'moneda');
    }
    for (const col of ['alias', 'titular', 'banco', 'ultimosCuatro', 'tarjetaTipo', 'tipoPago', 'grupoId', 'ambito']) {
      await queryInterface.removeColumn('gastos_fijos', col);
    }
    await queryInterface.dropTable('registro_auditoria');
    await queryInterface.dropTable('permisos_menor');
    await queryInterface.dropTable('vinculos_tutor');
    await queryInterface.removeColumn('usuarios', 'fechaNacimiento');
  },
};
