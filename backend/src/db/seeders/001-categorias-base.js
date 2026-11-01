'use strict';
const { randomUUID } = require('crypto');

const NOMBRES = [
  'Alimentos', 'Transporte', 'Servicios', 'Vivienda', 'Salud',
  'Educación', 'Entretenimiento', 'Ropa', 'Impuestos', 'Otros',
];

module.exports = {
  async up(queryInterface) {
    const [existentes] = await queryInterface.sequelize.query(
      'SELECT nombre FROM categorias WHERE "usuarioId" IS NULL'
    );
    const ya = new Set(existentes.map((c) => c.nombre));
    const ahora = new Date();
    const filas = NOMBRES.filter((n) => !ya.has(n)).map((nombre) => ({
      id: randomUUID(), nombre, usuarioId: null, archivada: false,
      createdAt: ahora, updatedAt: ahora,
    }));
    if (filas.length) await queryInterface.bulkInsert('categorias', filas);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('categorias', {
      usuarioId: null,
      nombre: { [Sequelize.Op.in]: NOMBRES },
    });
  },
};
