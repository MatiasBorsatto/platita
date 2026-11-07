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

// Código ISO de 3 letras. Sin moneda explícita, el movimiento es en pesos.
function validarMoneda(valor) {
  if (valor === undefined || valor === null) return 'ARS';
  if (typeof valor !== 'string' || !/^[A-Z]{3}$/.test(valor)) throw new ErrorValidacion('La moneda debe ser un código de 3 letras (por ejemplo ARS)');
  return valor;
}

function validarCrear(body = {}) {
  return {
    tipo: validarTipo(body.tipo),
    moneda: validarMoneda(body.moneda),
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
  if (body.moneda !== undefined) datos.moneda = validarMoneda(body.moneda);
  return datos;
}

function validarAportes(aportes) {
  if (aportes === undefined || aportes === null) return undefined;
  if (!Array.isArray(aportes)) throw new ErrorValidacion('aportes debe ser una lista');
  return aportes.map((a) => {
    const dato = {
      usuarioId: validarUuid(a?.usuarioId, 'usuarioId'),
      monto: validarMonto(a?.monto),
    };
    if (a?.fecha !== undefined && a?.fecha !== null) dato.fecha = validarFecha(a.fecha);
    return dato;
  });
}

function validarGastoCompartido(body = {}) {
  const datos = {
    pagadorId: body.pagadorId ? validarUuid(body.pagadorId, 'pagadorId') : null,
    monto: validarMonto(body.monto),
    fecha: validarFecha(body.fecha),
    descripcion: validarDescripcion(body.descripcion),
    categoriaId: body.categoriaId ? validarUuid(body.categoriaId, 'categoriaId') : null,
    moneda: validarMoneda(body.moneda),
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
  if (body.aportes !== undefined) datos.aportes = validarAportes(body.aportes);
  return datos;
}

function validarEdicionGastoCompartido(body = {}) {
  const datos = {};
  if (body.fecha !== undefined) datos.fecha = validarFecha(body.fecha);
  if (body.monto !== undefined) datos.monto = validarMonto(body.monto);
  if (body.moneda !== undefined) datos.moneda = validarMoneda(body.moneda);
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
    if (!Array.isArray(body.participantes) || body.participantes.length === 0) {
      throw new ErrorValidacion('participantes debe ser una lista no vacía');
    }
    datos.participantes = body.participantes.map((p) => ({
      usuarioId: validarUuid(p?.usuarioId, 'usuarioId'),
      monto: validarMonto(p?.monto),
      categoriaId: p?.categoriaId ? validarUuid(p.categoriaId, 'categoriaId') : null,
    }));
  }
  if (body.aportes !== undefined) datos.aportes = validarAportes(body.aportes);
  return datos;
}

function validarAporte(body = {}) {
  return {
    usuarioId: body.usuarioId === undefined ? null : validarUuid(body.usuarioId, 'usuarioId'),
    monto: validarMonto(body.monto),
    fecha: body.fecha === undefined ? null : validarFecha(body.fecha),
  };
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
  validarAporte,
  validarEditar,
  validarFiltros,
  validarMes,
  validarUuid,
  validarFecha,
  validarDescripcion,
};
