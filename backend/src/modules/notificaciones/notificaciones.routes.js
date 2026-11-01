const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { validarUuid } = require('../movimientos/movimientos.validation');
const service = require('./notificaciones.service');

const router = Router();
router.use(autenticar);

router.get('/', async (req, res) => {
  res.json(await service.listarNotificaciones(req.usuario.id));
});

router.patch('/:id/leida', async (req, res) => {
  res.json(await service.marcarLeida(req.usuario.id, validarUuid(req.params.id, 'id')));
});

module.exports = router;
