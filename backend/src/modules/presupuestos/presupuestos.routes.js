const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { validarMonto } = require('../../utils/dinero');
const { ErrorValidacion } = require('../../utils/errores');
const { validarMes, validarUuid } = require('../movimientos/movimientos.validation');
const service = require('./presupuestos.service');

const router = Router();
router.use(autenticar);

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
  res.json(await service.upsertPresupuesto(req.usuario.id, datos));
});

router.delete('/:id', async (req, res) => {
  await service.eliminarPresupuesto(req.usuario.id, validarUuid(req.params.id, 'id'));
  res.status(204).end();
});

module.exports = router;
