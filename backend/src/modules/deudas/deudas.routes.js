const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const service = require('./deudas.service');

const router = Router();
router.use(autenticar);

router.get('/', async (req, res) => {
  res.json(await service.listarDeudas(req.usuario.id));
});

module.exports = router;
