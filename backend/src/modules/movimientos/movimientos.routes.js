const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { validarIdParam } = require('../../middlewares/validarIdParam');
const service = require('./movimientos.service');
const { validarCrear, validarEditar, validarFiltros } = require('./movimientos.validation');

const router = Router();
router.use(autenticar);
router.param('id', validarIdParam);

router.get('/', async (req, res) => {
  const filtros = validarFiltros(req.query);
  const { items, total } = await service.listarMovimientos(req.usuario.id, filtros);
  res.json({ items, total, page: filtros.page, limit: filtros.limit });
});

router.post('/', async (req, res) => {
  res.status(201).json(await service.crearMovimiento(req.usuario.id, validarCrear(req.body)));
});

router.patch('/:id', async (req, res) => {
  res.json(await service.editarMovimiento(req.usuario.id, req.params.id, validarEditar(req.body)));
});

router.delete('/:id', async (req, res) => {
  await service.eliminarMovimiento(req.usuario.id, req.params.id);
  res.status(204).end();
});

module.exports = router;
