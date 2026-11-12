const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { grupoAccesible } = require('../../middlewares/grupoAccesible');
const { validarUuid, validarFecha, validarMes } = require('../movimientos/movimientos.validation');
const historico = require('../estadisticas/historico.service');
const { validarMonto } = require('../../utils/dinero');
const { ErrorValidacion } = require('../../utils/errores');
const service = require('./saldos.service');
const { requierePermiso } = require('../../middlewares/requierePermiso');
const { PERMISOS } = require('../autorizacion/permisos');

const verGastos = requierePermiso(PERMISOS.GASTOS_VER_GRUPO, { porGrupo: true });
const crearGastos = requierePermiso(PERMISOS.GASTOS_CREAR_GRUPO, { porGrupo: true });

const router = Router();
router.use(autenticar);

function validarMonedaPago(valor) {
  if (typeof valor !== 'string' || !/^[A-Z]{3}$/.test(valor)) throw new ErrorValidacion('La moneda debe ser un código de 3 letras (por ejemplo ARS)');
  return valor;
}

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
    moneda: body.moneda === undefined || body.moneda === null ? 'ARS' : validarMonedaPago(body.moneda),
    fecha: validarFecha(body.fecha),
    nota,
  };
}

router.get('/:id/saldos', grupoAccesible(), verGastos, async (req, res) => {
  res.json(await service.saldosDelGrupo(req.usuario.id, req.grupoId));
});

// Evolución de los saldos del grupo mes a mes (M-07), para el gráfico del detalle del grupo.
router.get('/:id/saldos/historico', grupoAccesible(), verGastos, async (req, res) => {
  if (req.query.desde === undefined || req.query.hasta === undefined) {
    throw new ErrorValidacion('Los parámetros desde y hasta son obligatorios');
  }
  const moneda = req.query.moneda === undefined ? 'ARS' : validarMonedaPago(req.query.moneda);
  res.json(await historico.saldosHistoricos(req.usuario.id, req.grupoId, validarMes(req.query.desde), validarMes(req.query.hasta), moneda));
});

router.post('/:id/pagos', grupoAccesible(), crearGastos, async (req, res) => {
  res.status(201).json(await service.registrarPago(req.usuario.id, req.grupoId, validarPago(req.body)));
});

router.get('/:id/pagos', grupoAccesible(), verGastos, async (req, res) => {
  res.json(await service.listarPagos(req.grupoId));
});

module.exports = router;
