const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { validarIdParam } = require('../../middlewares/validarIdParam');
const service = require('./movimientos.service');
const presupuestos = require('../presupuestos/presupuestos.service');
const { validarCrear, validarEditar, validarFiltros } = require('./movimientos.validation');

const { requierePermiso } = require('../../middlewares/requierePermiso');
const { PERMISOS } = require('../autorizacion/permisos');

const router = Router();
router.use(autenticar);
router.param('id', validarIdParam);

router.get('/', requierePermiso(PERMISOS.MOVIMIENTOS_VER), async (req, res) => {
  const filtros = validarFiltros(req.query);
  const { items, total } = await service.listarMovimientos(req.usuario.id, filtros);
  res.json({ items, total, page: filtros.page, limit: filtros.limit });
});

router.get('/dinero-actual', requierePermiso(PERMISOS.MOVIMIENTOS_VER), async (req, res) => {
  res.json(await service.dineroActual(req.usuario.id));
});

// Después de cada gasto se revisan los presupuestos de su mes (los avisos se generan acá, no al consultar).
router.post('/', requierePermiso(PERMISOS.GASTOS_CREAR_SIMPLES), async (req, res) => {
  const mov = await service.crearMovimiento(req.usuario.id, validarCrear(req.body));
  if (mov.tipo === 'gasto') await presupuestos.revisarAlertas([req.usuario.id], [mov.fecha]);
  res.status(201).json(mov);
});

router.patch('/:id', requierePermiso(PERMISOS.GASTOS_EDITAR_SIMPLES), async (req, res) => {
  const mov = await service.editarMovimiento(req.usuario.id, req.params.id, validarEditar(req.body));
  if (mov.tipo === 'gasto') await presupuestos.revisarAlertas([req.usuario.id], [mov.fecha]);
  res.json(mov);
});

router.delete('/:id', requierePermiso(PERMISOS.GASTOS_ELIMINAR_SIMPLES), async (req, res) => {
  await service.eliminarMovimiento(req.usuario.id, req.params.id);
  res.status(204).end();
});

module.exports = router;
