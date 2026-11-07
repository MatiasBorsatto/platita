'use strict';

// El único acceso es email + contraseña. Se elimina el identificador de Google.
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('usuarios', 'googleId');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('usuarios', 'googleId', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
