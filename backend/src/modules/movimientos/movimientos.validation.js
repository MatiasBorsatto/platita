const { validarMonto } = require('../../utils/dinero');
const { ErrorValidacion } = require('../../utils/errores');

const TIPOS = ['ingreso', 'gasto'];
const LIMITE_DEFECTO = 20;
const LIMITE_MAXIMO = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validarTipo(tipo) {
  if (!TIPOS.includes(tipo)) throw new ErrorValidacion('El tipo debe ser ingreso o gasto');
  return tipo;
}

function validarFecha(fecha) {
  const m = typeof fecha === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha) : null;
  if (!m) throw new ErrorValidacion('La fecha debe tener formato YYYY-MM-DD');
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
    throw new ErrorValidacion('La fecha no es válida');
  }
  return fecha;
}

function validarDescripcion(descripcion) {
  if (descripcion === null || descripcion === undefined) return null;
  if (typeof descripcion !== 'string') throw new ErrorValidacion('La descripción debe ser texto');
  const limpia = descripcion.trim();
  if (limpia.length > 255) throw new ErrorValidacion('La descripción es demasiado larga');
  return limpia || null;
}

function validarUuid(valor, nombre) {
  if (typeof valor !== 'string' || !UUID.test(valor)) throw new ErrorValidacion(`${nombre} inválido`);
  return valor;
}

function validarMes(mes) {
  if (typeof mes !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    throw new ErrorValidacion('El mes debe tener formato YYYY-MM');
  }
  return mes;
}

function validarCrear(body = {}) {
  return {
    tipo: validarTipo(body.tipo),
    monto: validarMonto(body.monto),
    fecha: validarFecha(body.fecha),
    descripcion: validarDescripcion(body.descripcion),
    categoriaId: body.categoriaId ? validarUuid(body.categoriaId, 'categoriaId') : null,
    metaId: body.metaId ? validarUuid(body.metaId, 'metaId') : null,
  };
}

function validarEditar(body = {}) {
  const datos = {};
  if (body.tipo !== undefined) datos.tipo = validarTipo(body.tipo);
  if (body.monto !== undefined) datos.monto = validarMonto(body.monto);
  if (body.fecha !== undefined) datos.fecha = validarFecha(body.fecha);
  if (body.descripcion !== undefined) datos.descripcion = validarDescripcion(body.descripcion);
  if (body.categoriaId !== undefined) {
    datos.categoriaId = body.categoriaId === null ? null : validarUuid(body.categoriaId, 'categoriaId');
  }
  return datos;
}

function validarGastoCompartido(body = {}) {
  const datos = {
    pagadorId: validarUuid(body.pagadorId, 'pagadorId'),
    monto: validarMonto(body.monto),
    fecha: validarFecha(body.fecha),
    descripcion: validarDescripcion(body.descripcion),
    categoriaId: body.categoriaId ? validarUuid(body.categoriaId, 'categoriaId') : null,
  };
  if (body.participantes !== undefined && body.participantes !== null) {
    if (!Array.isArray(body.participantes) || body.participantes.length === 0) {
      throw new ErrorValidacion('participantes debe ser una lista no vacía');
    }
    datos.participantes = body.participantes.map((p) => ({
      usuarioId: validarUuid(p?.usuarioId, 'usuarioId'),
      monto: validarMonto(p?.monto),
      categoriaId: p?.categoriaId ? validarUuid(p.categoriaId, 'categoriaId') : null,
    }));
  }
  return datos;
}

function validarEdicionGastoCompartido(body = {}) {
  const datos = {};
  if (body.fecha !== undefined) datos.fecha = validarFecha(body.fecha);
  if (body.monto !== undefined) datos.monto = validarMonto(body.monto);
  if (body.descripcion !== undefined) {
    datos.descripcion = validarDescripcion(body.descripcion);
    if (datos.descripcion && datos.descripcion.length > 200) {
      throw new ErrorValidacion('La descripción no puede superar los 200 caracteres');
    }
  }
  if (body.categoriaId !== undefined) {
    datos.categoriaId = body.categoriaId === null ? null : validarUuid(body.categoriaId, 'categoriaId');
  }
  if (body.pagadorId !== undefined) datos.pagadorId = validarUuid(body.pagadorId, 'pagadorId');
  if (body.participantes !== undefined && body.participantes !== null) {
    datos.participantes = validarGastoCompartido({
      ...body,
      pagadorId: body.pagadorId ?? '00000000-0000-4000-8000-000000000000',
      monto: '1',
      fecha: '2000-01-01',
    }).participantes;
  }
  return datos;
}

function entero(valor, nombre) {
  if (typeof valor !== 'string' || !/^\d+$/.test(valor) || Number(valor) < 1) {
    throw new ErrorValidacion(`${nombre} inválido`);
  }
  return Number(valor);
}

function validarFiltros(query = {}) {
  const filtros = {};
  if (query.mes !== undefined) filtros.mes = validarMes(query.mes);
  if (query.tipo !== undefined) filtros.tipo = validarTipo(query.tipo);
  if (query.categoriaId !== undefined) filtros.categoriaId = validarUuid(query.categoriaId, 'categoriaId');
  filtros.page = query.page === undefined ? 1 : entero(query.page, 'page');
  filtros.limit =
    query.limit === undefined ? LIMITE_DEFECTO : Math.min(entero(query.limit, 'limit'), LIMITE_MAXIMO);
  return filtros;
}

module.exports = {
  validarCrear,
  validarGastoCompartido,
  validarEdicionGastoCompartido,
  validarEditar,
  validarFiltros,
  validarMes,
  validarUuid,
  validarFecha,
  validarDescripcion,
};
