const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { ErrorValidacion } = require('../../utils/errores');
const { validarMes } = require('../movimientos/movimientos.validation');
const service = require('./estadisticas.service');
const historico = require('./historico.service');

const router = Router();
router.use(autenticar);

router.get('/mensual', async (req, res) => {
  if (req.query.mes === undefined) throw new ErrorValidacion('El mes es obligatorio');
  res.json(await service.resumenMensual(req.usuario.id, validarMes(req.query.mes)));
});

router.get('/historico', async (req, res) => {
  if (req.query.desde === undefined || req.query.hasta === undefined) {
    throw new ErrorValidacion('Los parámetros desde y hasta son obligatorios');
  }
  res.json(await historico.serieHistorica(req.usuario.id, validarMes(req.query.desde), validarMes(req.query.hasta)));
});

module.exports = router;
