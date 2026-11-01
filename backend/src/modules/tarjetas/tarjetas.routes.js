const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { validarMonto } = require('../../utils/dinero');
const { ErrorValidacion } = require('../../utils/errores');
const { validarUuid, validarFecha, validarDescripcion, validarMes } = require('../movimientos/movimientos.validation');
const service = require('./tarjetas.service');
const { crearCompra } = require('./compras.service');
const { resumenTarjeta, registrarPagoResumen } = require('./resumen.service');

const router = Router();
router.use(autenticar);

const MODALIDADES = ['por_cuota', 'compra_completa'];
const MAX_CUOTAS = 60;

function validarNombre(nombre) {
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 60) {
    throw new ErrorValidacion('El nombre es obligatorio (máximo 60 caracteres)');
  }
  return nombre.trim();
}

function validarDia(valor, nombre) {
  if (!Number.isInteger(valor) || valor < 1 || valor > 31) {
    throw new ErrorValidacion(`${nombre} debe ser un entero entre 1 y 31`);
  }
  return valor;
}

router.get('/', async (req, res) => {
  res.json(await service.listarTarjetas(req.usuario.id));
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  const datos = {
    nombre: validarNombre(b.nombre),
    diaCierre: validarDia(b.diaCierre, 'diaCierre'),
    diaVencimiento: validarDia(b.diaVencimiento, 'diaVencimiento'),
  };
  res.status(201).json(await service.crearTarjeta(req.usuario.id, datos));
});

router.patch('/:id', async (req, res) => {
  const b = req.body || {};
  const datos = {};
  if (b.nombre !== undefined) datos.nombre = validarNombre(b.nombre);
  if (b.diaCierre !== undefined) datos.diaCierre = validarDia(b.diaCierre, 'diaCierre');
  if (b.diaVencimiento !== undefined) datos.diaVencimiento = validarDia(b.diaVencimiento, 'diaVencimiento');
  res.json(await service.editarTarjeta(req.usuario.id, validarUuid(req.params.id, 'id'), datos));
});

router.delete('/:id', async (req, res) => {
  await service.eliminarTarjeta(req.usuario.id, validarUuid(req.params.id, 'id'));
  res.status(204).end();
});

router.post('/:id/compras', async (req, res) => {
  const b = req.body || {};
  if (!MODALIDADES.includes(b.modalidad)) {
    throw new ErrorValidacion('La modalidad debe ser por_cuota o compra_completa');
  }
  if (!Number.isInteger(b.cuotas) || b.cuotas < 1 || b.cuotas > MAX_CUOTAS) {
    throw new ErrorValidacion(`Las cuotas deben ser un entero entre 1 y ${MAX_CUOTAS}`);
  }
  const datos = {
    montoTotal: validarMonto(b.montoTotal),
    cuotas: b.cuotas,
    modalidad: b.modalidad,
    fecha: validarFecha(b.fecha),
    descripcion: validarDescripcion(b.descripcion),
    categoriaId: b.categoriaId ? validarUuid(b.categoriaId, 'categoriaId') : null,
  };
  const { compra, movimientos } = await crearCompra(
    req.usuario.id,
    validarUuid(req.params.id, 'id'),
    datos
  );
  res.status(201).json({ compra, movimientos });
});

router.get('/:id/resumen', async (req, res) => {
  const mes = validarMes(req.query.mes);
  res.json(await resumenTarjeta(req.usuario.id, validarUuid(req.params.id, 'id'), mes));
});

router.post('/:id/pagos', async (req, res) => {
  const b = req.body || {};
  const datos = { monto: validarMonto(b.monto), fecha: validarFecha(b.fecha) };
  const mov = await registrarPagoResumen(req.usuario.id, validarUuid(req.params.id, 'id'), datos);
  res.status(201).json(mov);
});

module.exports = router;
