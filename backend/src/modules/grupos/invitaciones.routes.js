const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { ErrorValidacion } = require('../../utils/errores');
const service = require('./invitaciones.service');

const router = Router();
router.use(autenticar);

router.post('/aceptar', async (req, res) => {
  const token = req.body?.token;
  if (typeof token !== 'string' || !token) throw new ErrorValidacion('token es obligatorio');
  res.json(await service.aceptarInvitacion(req.usuario.id, token));
});

module.exports = router;
