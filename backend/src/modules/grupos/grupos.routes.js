const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { grupoAccesible } = require('../../middlewares/grupoAccesible');
const { validarUuid, validarGastoCompartido, validarEdicionGastoCompartido, validarFiltros } = require('../movimientos/movimientos.validation');
const { ErrorValidacion, ErrorNoEncontrado } = require('../../utils/errores');
const service = require('./grupos.service');
const invitaciones = require('./invitaciones.service');
const compartidos = require('../movimientos/compartidos.service');

const router = Router();
router.use(autenticar);

function idGasto(valor) {
  try {
    return validarUuid(valor, 'movimientoId');
  } catch {
    throw new ErrorNoEncontrado('Gasto no encontrado');
  }
}

function validarNombre(body) {
  const nombre = typeof body?.nombre === 'string' ? body.nombre.trim() : '';
  if (!nombre || nombre.length > 100) throw new ErrorValidacion('nombre es obligatorio (máx. 100 caracteres)');
  return nombre;
}

function validarCodigo(body) {
  const codigo = typeof body?.codigo === 'string' ? body.codigo.trim().toUpperCase() : '';
  if (!codigo || codigo.length > 16) throw new ErrorValidacion('Código inválido o vencido');
  return codigo;
}

router.post('/', async (req, res) => {
  res.status(201).json(await service.crearGrupo(req.usuario.id, validarNombre(req.body)));
});

router.get('/', async (req, res) => {
  res.json(await service.listarGruposDeUsuario(req.usuario.id));
});

router.post('/unirse', async (req, res) => {
  res.json(await service.unirseConCodigo(req.usuario.id, validarCodigo(req.body)));
});

router.get('/:id', grupoAccesible(), async (req, res) => {
  res.json(await service.obtenerGrupo(req.grupoId, req.miembro.rol));
});

router.post('/:id/codigo/regenerar', grupoAccesible('admin'), async (req, res) => {
  res.json(await service.regenerarCodigo(req.usuario.id, req.grupoId));
});

router.delete('/:id/miembros/:usuarioId', grupoAccesible('admin'), async (req, res) => {
  const usuarioId = validarUuid(req.params.usuarioId, 'usuarioId');
  await service.quitarMiembro(req.usuario.id, req.grupoId, usuarioId);
  res.status(204).end();
});

router.patch('/:id/miembros/:usuarioId', grupoAccesible('admin'), async (req, res) => {
  const usuarioId = validarUuid(req.params.usuarioId, 'usuarioId');
  const rol = req.body?.rol;
  if (rol !== 'admin' && rol !== 'miembro') throw new ErrorValidacion("rol debe ser 'admin' o 'miembro'");
  res.json(await service.cambiarRol(req.grupoId, usuarioId, rol));
});

router.post('/:id/invitaciones', grupoAccesible('admin'), async (req, res) => {
  res.status(201).json(await invitaciones.invitar(req.usuario.id, req.grupoId, req.body?.email));
});

router.delete('/:id/invitaciones/:invitacionId', grupoAccesible('admin'), async (req, res) => {
  const invitacionId = validarUuid(req.params.invitacionId, 'invitacionId');
  await invitaciones.cancelarInvitacion(req.usuario.id, invitacionId, req.grupoId);
  res.status(204).end();
});

router.post('/:id/gastos', grupoAccesible(), async (req, res) => {
  const datos = validarGastoCompartido(req.body);
  res.status(201).json(await compartidos.crearGastoCompartido(req.usuario.id, { ...datos, grupoId: req.grupoId }));
});

router.get('/:id/gastos', grupoAccesible(), async (req, res) => {
  const { page, limit } = validarFiltros({ page: req.query.page, limit: req.query.limit });
  const { items, total } = await compartidos.listarGastosCompartidos(req.grupoId, { page, limit });
  res.json({ items, total, page, limit });
});

router.patch('/:id/gastos/:movimientoId', grupoAccesible(), async (req, res) => {
  const movimientoId = idGasto(req.params.movimientoId);
  const datos = validarEdicionGastoCompartido(req.body);
  res.json(await compartidos.editarGastoCompartido(req.usuario.id, req.grupoId, movimientoId, datos));
});

router.delete('/:id/gastos/:movimientoId', grupoAccesible(), async (req, res) => {
  const movimientoId = idGasto(req.params.movimientoId);
  await compartidos.eliminarGastoCompartido(req.usuario.id, req.grupoId, movimientoId);
  res.status(204).end();
});

router.post('/:id/salir', grupoAccesible(), async (req, res) => {
  await service.salirDeGrupo(req.usuario.id, req.grupoId);
  res.status(204).end();
});

module.exports = router;
