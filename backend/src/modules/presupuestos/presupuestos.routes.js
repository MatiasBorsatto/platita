const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { validarMonto } = require('../../utils/dinero');
const { ErrorValidacion } = require('../../utils/errores');
const { validarMes, validarUuid } = require('../movimientos/movimientos.validation');
const service = require('./presupuestos.service');

const { requierePermiso } = require('../../middlewares/requierePermiso');
const { PERMISOS } = require('../autorizacion/permisos');

const router = Router();
router.use(autenticar);
// No hay un permiso aparte para administrar presupuestos: quien no puede verlos tampoco los cambia.
router.use(requierePermiso(PERMISOS.PRESUPUESTOS_VER));

function mesRequerido(query) {
  if (query.mes === undefined) throw new ErrorValidacion('El mes es obligatorio');
  return validarMes(query.mes);
}

router.get('/', async (req, res) => {
  res.json(await service.listarPresupuestos(req.usuario.id, mesRequerido(req.query)));
});

// Antes de '/:id' para que 'estado' no se interprete como id.
router.get('/estado', async (req, res) => {
  res.json(await service.estadoPresupuestos(req.usuario.id, mesRequerido(req.query)));
});

router.put('/', async (req, res) => {
  const b = req.body || {};
  const datos = {
    categoriaId: validarUuid(b.categoriaId, 'categoriaId'),
    mes: validarMes(b.mes),
    montoLimite: validarMonto(b.montoLimite),
  };
  if (b.regla !== undefined) datos.regla = b.regla;
  if (b.moneda !== undefined) {
    if (typeof b.moneda !== 'string' || !/^[A-Z]{3}$/.test(b.moneda)) throw new ErrorValidacion('La moneda debe ser un código de 3 letras (por ejemplo ARS)');
    datos.moneda = b.moneda;
  }
  res.json(await service.upsertPresupuesto(req.usuario.id, datos));
});

router.delete('/:id', async (req, res) => {
  await service.eliminarPresupuesto(req.usuario.id, validarUuid(req.params.id, 'id'));
  res.status(204).end();
});

module.exports = router;
