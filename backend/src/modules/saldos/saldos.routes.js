const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { grupoAccesible } = require('../../middlewares/grupoAccesible');
const { validarUuid, validarFecha } = require('../movimientos/movimientos.validation');
const { validarMonto } = require('../../utils/dinero');
const { ErrorValidacion } = require('../../utils/errores');
const service = require('./saldos.service');

const router = Router();
router.use(autenticar);

function validarPago(body = {}) {
  let nota = null;
  if (body.nota !== undefined && body.nota !== null) {
    if (typeof body.nota !== 'string') throw new ErrorValidacion('La nota debe ser texto');
    nota = body.nota.trim() || null;
    if (nota && nota.length > 255) throw new ErrorValidacion('La nota es demasiado larga');
  }
  return {
    deudorId: validarUuid(body.deudorId, 'deudorId'),
    acreedorId: validarUuid(body.acreedorId, 'acreedorId'),
    monto: validarMonto(body.monto),
    fecha: validarFecha(body.fecha),
    nota,
  };
}

router.get('/:id/saldos', grupoAccesible(), async (req, res) => {
  res.json(await service.saldosDelGrupo(req.usuario.id, req.grupoId));
});

router.post('/:id/pagos', grupoAccesible(), async (req, res) => {
  res.status(201).json(await service.registrarPago(req.usuario.id, req.grupoId, validarPago(req.body)));
});

router.get('/:id/pagos', grupoAccesible(), async (req, res) => {
  res.json(await service.listarPagos(req.grupoId));
});

module.exports = router;
