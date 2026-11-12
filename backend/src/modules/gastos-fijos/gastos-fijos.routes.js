const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { validarIdParam } = require('../../middlewares/validarIdParam');
const { validarUuid, validarMes } = require('../movimientos/movimientos.validation');
const { hoyBA } = require('../../utils/fechas');
const { validarGastoFijo, validarConcepto, validarPago } = require('./gastos-fijos.validation');
const service = require('./gastos-fijos.service');
const presupuestos = require('../presupuestos/presupuestos.service');
const { paginar } = require('../../utils/paginacion');
const { exigir, clasificacionDe } = require('../autorizacion/autorizacion.service');
const { PERMISOS } = require('../autorizacion/permisos');
const { GastoFijo, MiembroGrupo } = require('../../db/models');
const { ErrorNoEncontrado } = require('../../utils/errores');
const { requierePermiso } = require('../../middlewares/requierePermiso');

// Permiso según el tipo de pago: los gastos con tarjeta tienen permisos propios, que un menor nunca obtiene.
function permisoPara(tipoPago, accion) {
  const tarjeta = tipoPago !== 'simple';
  const mapa = {
    crear: tarjeta ? PERMISOS.TARJETAS_REGISTRAR : PERMISOS.GASTOS_FIJOS_CREAR,
    editar: tarjeta ? PERMISOS.TARJETAS_MODIFICAR : PERMISOS.GASTOS_FIJOS_EDITAR,
    eliminar: tarjeta ? PERMISOS.TARJETAS_ELIMINAR : PERMISOS.GASTOS_FIJOS_ELIMINAR,
  };
  return mapa[accion];
}

// Editar o eliminar exige permiso sobre el tipo actual del gasto y, si cambia, sobre el nuevo.
async function exigirSobreGastoExistente(usuarioId, id, tipoNuevo, accion) {
  const actual = await GastoFijo.findOne({ where: { id, usuarioId }, attributes: ['tipoPago'] });
  if (!actual) return; // el servicio responde 404 sin revelar si el gasto existe
  await exigir(usuarioId, permisoPara(actual.tipoPago, accion));
  if (tipoNuevo && tipoNuevo !== actual.tipoPago) await exigir(usuarioId, permisoPara(tipoNuevo, accion));
}

async function exigirMiembro(usuarioId, grupoId) {
  const miembro = await MiembroGrupo.findOne({ where: { grupoId, usuarioId } });
  if (!miembro) throw new ErrorNoEncontrado('Grupo no encontrado');
}

// Los menores nunca ven los datos bancarios de una tarjeta, aunque el gasto sea del grupo.
const DATOS_TARJETA = ['tarjetaTipo', 'ultimosCuatro', 'banco', 'titular', 'alias'];
function sinDatosTarjeta(dto) {
  const quitar = (d) => {
    const copia = { ...d };
    for (const campo of DATOS_TARJETA) delete copia[campo];
    return copia;
  };
  return Array.isArray(dto) ? dto.map(quitar) : quitar(dto);
}

async function respuestaSegunClase(usuarioId, dto) {
  return (await clasificacionDe(usuarioId)) === 'adulto' ? dto : sinDatosTarjeta(dto);
}

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

// Ver cualquier gasto fijo exige el permiso de ver. Tocar conceptos o pagar cuotas es editar el gasto.
const ver = requierePermiso(PERMISOS.GASTOS_FIJOS_VER);
const editarExistente = async (req, res, next) => {
  await exigirSobreGastoExistente(req.usuario.id, req.params.id, undefined, 'editar');
  next();
};

router.get('/', ver, async (req, res) => {
  const lista = await respuestaSegunClase(req.usuario.id, await service.listarGastosFijos(req.usuario.id));
  res.json(paginar(lista, req.query));
});

router.post('/', async (req, res) => {
  const datos = validarGastoFijo(req.body);
  await exigir(req.usuario.id, permisoPara(datos.tipoPago, 'crear'));
  if (datos.ambito === 'grupo') await exigirMiembro(req.usuario.id, datos.grupoId);
  res.status(201).json(await service.crearGastoFijo(req.usuario.id, datos));
});

router.get('/vencimientos', ver, async (req, res) => {
  res.json(await service.listarVencimientos(req.usuario.id, mesDeQuery(req.query)));
});

router.get('/recordatorios', ver, async (req, res) => {
  res.json(await service.recordatorios(req.usuario.id));
});

router.get('/:id', ver, async (req, res) => {
  const mes = req.query.mes === undefined ? null : validarMes(req.query.mes);
  res.json(await respuestaSegunClase(req.usuario.id, await service.obtenerGastoFijo(req.usuario.id, req.params.id, mes)));
});

router.patch('/:id', async (req, res) => {
  const datos = validarGastoFijo(req.body, { parcial: true });
  await exigirSobreGastoExistente(req.usuario.id, req.params.id, datos.tipoPago, 'editar');
  res.json(await service.editarGastoFijo(req.usuario.id, req.params.id, datos));
});

router.delete('/:id', async (req, res) => {
  await exigirSobreGastoExistente(req.usuario.id, req.params.id, undefined, 'eliminar');
  res.json(await service.eliminarGastoFijo(req.usuario.id, req.params.id));
});

router.post('/:id/conceptos', editarExistente, async (req, res) => {
  res
    .status(201)
    .json(await service.crearConcepto(req.usuario.id, req.params.id, validarConcepto(req.body)));
});

router.patch('/:id/conceptos/:conceptoId', editarExistente, async (req, res) => {
  res.json(
    await service.editarConcepto(
      req.usuario.id,
      req.params.id,
      req.params.conceptoId,
      validarConcepto(req.body, { parcial: true })
    )
  );
});

router.delete('/:id/conceptos/:conceptoId', editarExistente, async (req, res) => {
  res.json(await service.eliminarConcepto(req.usuario.id, req.params.id, req.params.conceptoId));
});

router.post('/:id/cuotas/:cuotaId/pagar', editarExistente, async (req, res) => {
  const pago = await service.pagarCuota(req.usuario.id, req.params.id, req.params.cuotaId, validarPago(req.body));
  // Pagar una cuota crea un gasto: se revisan los presupuestos de ese mes.
  await presupuestos.revisarAlertas([req.usuario.id], [pago.movimiento.fecha]);
  res.json(pago);
});

router.post('/:id/cuotas/:cuotaId/deshacer-pago', editarExistente, async (req, res) => {
  res.json(await service.deshacerPago(req.usuario.id, req.params.id, req.params.cuotaId));
});

module.exports = router;
