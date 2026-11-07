const { validarMonto, aCentavos } = require('../../utils/dinero');
const { validarUuid, validarFecha, validarMes } = require('../movimientos/movimientos.validation');
const { hoyBA } = require('../../utils/fechas');
const { ErrorValidacion } = require('../../utils/errores');

const MAX_CUOTAS = 120;

function texto(valor, nombre, maximo) {
  if (typeof valor !== 'string') throw new ErrorValidacion(`${nombre} es obligatorio`);
  const limpio = valor.trim();
  if (!limpio) throw new ErrorValidacion(`${nombre} es obligatorio`);
  if (limpio.length > maximo) throw new ErrorValidacion(`${nombre} es demasiado largo`);
  return limpio;
}

function validarDia(valor) {
  if (!Number.isInteger(valor) || valor < 1 || valor > 31) {
    throw new ErrorValidacion('El día de vencimiento debe estar entre 1 y 31');
  }
  return valor;
}

function validarCategoria(valor) {
  return valor === null ? null : validarUuid(valor, 'categoriaId');
}

function validarConcepto(body = {}, { parcial = false } = {}) {
  const datos = {};
  if (!parcial || body.nombre !== undefined) datos.nombre = texto(body.nombre, 'El nombre', 100);
  if (!parcial || body.montoTotal !== undefined) datos.montoTotal = validarMonto(body.montoTotal);
  if (!parcial || body.mesInicio !== undefined) {
    datos.mesInicio = body.mesInicio === undefined ? hoyBA().slice(0, 7) : validarMes(body.mesInicio);
  }
  if (!parcial || body.cuotas !== undefined || body.recurrente !== undefined) {
    let cuotas = null;
    if (body.recurrente === true || body.cuotas === null || body.cuotas === undefined) {
      cuotas = null;
    } else {
      if (!Number.isInteger(body.cuotas) || body.cuotas < 1 || body.cuotas > MAX_CUOTAS) {
        throw new ErrorValidacion(`La cantidad de cuotas debe estar entre 1 y ${MAX_CUOTAS}`);
      }
      cuotas = body.cuotas;
    }
    if (cuotas !== null) {
      const totalTexto = datos.montoTotal ?? body.montoTotal;
      if (totalTexto !== undefined && aCentavos(totalTexto) < BigInt(cuotas)) {
        throw new ErrorValidacion('El monto total es demasiado bajo para esa cantidad de cuotas');
      }
    }
    datos.cuotas = cuotas;
  }
  if (body.archivado !== undefined) {
    if (typeof body.archivado !== 'boolean') throw new ErrorValidacion('archivado debe ser booleano');
    datos.archivado = body.archivado;
  }
  return datos;
}

function validarGastoFijo(body = {}, { parcial = false } = {}) {
  const datos = {};
  if (!parcial || body.nombre !== undefined) datos.nombre = texto(body.nombre, 'El nombre', 100);
  if (!parcial || body.diaVencimiento !== undefined) {
    datos.diaVencimiento = validarDia(body.diaVencimiento);
  }
  if (body.categoriaId !== undefined) {
    datos.categoriaId = body.categoriaId === null ? null : validarCategoria(body.categoriaId);
  } else if (!parcial) {
    datos.categoriaId = null;
  }
  if (body.archivado !== undefined) {
    if (typeof body.archivado !== 'boolean') throw new ErrorValidacion('archivado debe ser booleano');
    datos.archivado = body.archivado;
  }
  if (!parcial && body.conceptos !== undefined) {
    if (!Array.isArray(body.conceptos)) throw new ErrorValidacion('conceptos debe ser una lista');
    datos.conceptos = body.conceptos.map((c) => validarConcepto(c));
  }
  return datos;
}

function validarPago(body = {}) {
  return { fecha: body.fecha === undefined ? null : validarFecha(body.fecha) };
}

module.exports = { validarGastoFijo, validarConcepto, validarPago };
