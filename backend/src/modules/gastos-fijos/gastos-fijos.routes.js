const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { validarIdParam } = require('../../middlewares/validarIdParam');
const { validarUuid, validarMes } = require('../movimientos/movimientos.validation');
const { hoyBA } = require('../../utils/fechas');
const { validarGastoFijo, validarConcepto, validarPago } = require('./gastos-fijos.validation');
const service = require('./gastos-fijos.service');

const router = Router();
router.use(autenticar);
router.param('id', validarIdParam);
router.param('conceptoId', (req, res, next, valor) => {
  validarUuid(valor, 'conceptoId');
  next();
});
router.param('cuotaId', (req, res, next, valor) => {
  validarUuid(valor, 'cuotaId');
  next();
});

const mesDeQuery = (query) => (query.mes === undefined ? hoyBA().slice(0, 7) : validarMes(query.mes));

router.get('/', async (req, res) => {
  res.json(await service.listarGastosFijos(req.usuario.id));
});

router.post('/', async (req, res) => {
  res.status(201).json(await service.crearGastoFijo(req.usuario.id, validarGastoFijo(req.body)));
});

router.get('/vencimientos', async (req, res) => {
  res.json(await service.listarVencimientos(req.usuario.id, mesDeQuery(req.query)));
});

router.get('/recordatorios', async (req, res) => {
  res.json(await service.recordatorios(req.usuario.id));
});

router.get('/:id', async (req, res) => {
  const mes = req.query.mes === undefined ? null : validarMes(req.query.mes);
  res.json(await service.obtenerGastoFijo(req.usuario.id, req.params.id, mes));
});

router.patch('/:id', async (req, res) => {
  res.json(
    await service.editarGastoFijo(
      req.usuario.id,
      req.params.id,
      validarGastoFijo(req.body, { parcial: true })
    )
  );
});

router.delete('/:id', async (req, res) => {
  res.json(await service.eliminarGastoFijo(req.usuario.id, req.params.id));
});

router.post('/:id/conceptos', async (req, res) => {
  res
    .status(201)
    .json(await service.crearConcepto(req.usuario.id, req.params.id, validarConcepto(req.body)));
});

router.patch('/:id/conceptos/:conceptoId', async (req, res) => {
  res.json(
    await service.editarConcepto(
      req.usuario.id,
      req.params.id,
      req.params.conceptoId,
      validarConcepto(req.body, { parcial: true })
    )
  );
});

router.delete('/:id/conceptos/:conceptoId', async (req, res) => {
  res.json(await service.eliminarConcepto(req.usuario.id, req.params.id, req.params.conceptoId));
});

router.post('/:id/cuotas/:cuotaId/pagar', async (req, res) => {
  res.json(
    await service.pagarCuota(req.usuario.id, req.params.id, req.params.cuotaId, validarPago(req.body))
  );
});

router.post('/:id/cuotas/:cuotaId/deshacer-pago', async (req, res) => {
  res.json(await service.deshacerPago(req.usuario.id, req.params.id, req.params.cuotaId));
});

module.exports = router;
