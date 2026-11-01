const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { validarUuid } = require('../movimientos/movimientos.validation');
const { validarCrear, validarEditar, validarAporte } = require('./metas.validation');
const service = require('./metas.service');

const router = Router();
router.use(autenticar);

router.get('/', async (req, res) => {
  res.json(await service.listarMetas(req.usuario.id));
});

router.post('/', async (req, res) => {
  res.status(201).json(await service.crearMeta(req.usuario.id, validarCrear(req.body)));
});

router.patch('/:id', async (req, res) => {
  const id = validarUuid(req.params.id, 'id');
  res.json(await service.editarMeta(req.usuario.id, id, validarEditar(req.body)));
});

router.delete('/:id', async (req, res) => {
  await service.eliminarMeta(req.usuario.id, validarUuid(req.params.id, 'id'));
  res.status(204).end();
});

router.post('/:id/aportes', async (req, res) => {
  const id = validarUuid(req.params.id, 'id');
  res.status(201).json(await service.registrarAporte(req.usuario.id, id, validarAporte(req.body)));
});

module.exports = router;
