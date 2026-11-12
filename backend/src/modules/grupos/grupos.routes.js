const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { grupoAccesible } = require('../../middlewares/grupoAccesible');
const { validarUuid, validarGastoCompartido, validarEdicionGastoCompartido, validarAporte, validarFiltros } = require('../movimientos/movimientos.validation');
const { ErrorValidacion, ErrorNoEncontrado } = require('../../utils/errores');
const service = require('./grupos.service');
const invitaciones = require('./invitaciones.service');
const compartidos = require('../movimientos/compartidos.service');
const presupuestos = require('../presupuestos/presupuestos.service');
const { requierePermiso } = require('../../middlewares/requierePermiso');
const { PERMISOS } = require('../autorizacion/permisos');

// Permisos evaluados dentro del grupo de la ruta (van después de grupoAccesible).
const verInfo = requierePermiso(PERMISOS.GRUPO_VER_INFO, { porGrupo: true });
const gestionar = requierePermiso(PERMISOS.GRUPO_GESTIONAR_INTEGRANTES, { porGrupo: true });
const verGastos = requierePermiso(PERMISOS.GASTOS_VER_GRUPO, { porGrupo: true });
const crearGastos = requierePermiso(PERMISOS.GASTOS_CREAR_GRUPO, { porGrupo: true });

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

router.post('/', requierePermiso(PERMISOS.GRUPO_GESTIONAR_INTEGRANTES), async (req, res) => {
  res.status(201).json(await service.crearGrupo(req.usuario.id, validarNombre(req.body)));
});

router.get('/', async (req, res) => {
  res.json(await service.listarGruposDeUsuario(req.usuario.id));
});

router.post('/unirse', async (req, res) => {
  res.json(await service.unirseConCodigo(req.usuario.id, validarCodigo(req.body)));
});

router.get('/:id', grupoAccesible(), verInfo, async (req, res) => {
  res.json(await service.obtenerGrupo(req.grupoId, req.miembro.rol));
});

router.post('/:id/codigo/regenerar', grupoAccesible('admin'), gestionar, async (req, res) => {
  res.json(await service.regenerarCodigo(req.usuario.id, req.grupoId));
});

router.delete('/:id/miembros/:usuarioId', grupoAccesible('admin'), gestionar, async (req, res) => {
  const usuarioId = validarUuid(req.params.usuarioId, 'usuarioId');
  await service.quitarMiembro(req.usuario.id, req.grupoId, usuarioId);
  res.status(204).end();
});

router.patch('/:id/miembros/:usuarioId', grupoAccesible('admin'), gestionar, async (req, res) => {
  const usuarioId = validarUuid(req.params.usuarioId, 'usuarioId');
  const rol = req.body?.rol;
  if (rol !== 'admin' && rol !== 'miembro') throw new ErrorValidacion("rol debe ser 'admin' o 'miembro'");
  res.json(await service.cambiarRol(req.grupoId, usuarioId, rol));
});

router.post('/:id/invitaciones', grupoAccesible('admin'), gestionar, async (req, res) => {
  res.status(201).json(await invitaciones.invitar(req.usuario.id, req.grupoId, req.body?.email));
});

router.delete('/:id/invitaciones/:invitacionId', grupoAccesible('admin'), gestionar, async (req, res) => {
  const invitacionId = validarUuid(req.params.invitacionId, 'invitacionId');
  await invitaciones.cancelarInvitacion(req.usuario.id, invitacionId, req.grupoId);
  res.status(204).end();
});

// Un gasto compartido suma a los presupuestos de cada participante: se revisan sus avisos.
const participantesDe = (gasto) => (gasto.participaciones ?? []).map((p) => p.usuarioId);

router.post('/:id/gastos', grupoAccesible(), crearGastos, async (req, res) => {
  const datos = validarGastoCompartido(req.body);
  const gasto = await compartidos.crearGastoCompartido(req.usuario.id, { ...datos, grupoId: req.grupoId });
  await presupuestos.revisarAlertas(participantesDe(gasto), [gasto.fecha]);
  res.status(201).json(gasto);
});

router.get('/:id/gastos', grupoAccesible(), verGastos, async (req, res) => {
  const { page, limit } = validarFiltros({ page: req.query.page, limit: req.query.limit });
  const { items, total } = await compartidos.listarGastosCompartidos(req.grupoId, { page, limit });
  res.json({ items, total, page, limit });
});

router.patch('/:id/gastos/:movimientoId', grupoAccesible(), crearGastos, async (req, res) => {
  const movimientoId = idGasto(req.params.movimientoId);
  const datos = validarEdicionGastoCompartido(req.body);
  const gasto = await compartidos.editarGastoCompartido(req.usuario.id, req.grupoId, movimientoId, datos);
  await presupuestos.revisarAlertas(participantesDe(gasto), [gasto.fecha]);
  res.json(gasto);
});

router.delete('/:id/gastos/:movimientoId', grupoAccesible(), crearGastos, async (req, res) => {
  const movimientoId = idGasto(req.params.movimientoId);
  await compartidos.eliminarGastoCompartido(req.usuario.id, req.grupoId, movimientoId);
  res.status(204).end();
});

router.post('/:id/gastos/:movimientoId/aportes', grupoAccesible(), crearGastos, async (req, res) => {
  const movimientoId = idGasto(req.params.movimientoId);
  const datos = validarAporte(req.body);
  res
    .status(201)
    .json(await compartidos.registrarAporte(req.usuario.id, req.grupoId, movimientoId, datos));
});

router.delete('/:id/gastos/:movimientoId/aportes/:aporteId', grupoAccesible(), crearGastos, async (req, res) => {
  const movimientoId = idGasto(req.params.movimientoId);
  const aporteId = validarUuid(req.params.aporteId, 'aporteId');
  await compartidos.eliminarAporte(req.usuario.id, req.grupoId, movimientoId, aporteId);
  res.status(204).end();
});

router.post('/:id/salir', grupoAccesible(), async (req, res) => {
  await service.salirDeGrupo(req.usuario.id, req.grupoId);
  res.status(204).end();
});

module.exports = router;
