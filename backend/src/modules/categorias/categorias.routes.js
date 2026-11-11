const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { validarIdParam } = require('../../middlewares/validarIdParam');
const controller = require('./categorias.controller');
const { requierePermiso } = require('../../middlewares/requierePermiso');
const { PERMISOS } = require('../autorizacion/permisos');

const router = Router();
router.use(autenticar);
router.param('id', validarIdParam);
// Listar queda libre: los formularios de movimientos la necesitan.
const administrar = requierePermiso(PERMISOS.CATEGORIAS_ADMINISTRAR);
router.get('/', controller.listar);
router.post('/', administrar, controller.crear);
router.patch('/:id', administrar, controller.editar);
router.delete('/:id', administrar, controller.archivar); // archiva; no hay borrado físico

module.exports = router;
