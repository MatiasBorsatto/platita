const { sequelize } = require('../src/db/sequelize');
const { Categoria } = require('../src/db/models');

afterAll(async () => {
  await sequelize.close();
});

test('las categorías base están cargadas', async () => {
  const cantidad = await Categoria.count({ where: { usuarioId: null } });
  expect(cantidad).toBeGreaterThanOrEqual(10);
});
