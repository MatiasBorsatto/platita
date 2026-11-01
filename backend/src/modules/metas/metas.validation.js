const { validarMonto } = require('../../utils/dinero');
const { ErrorValidacion } = require('../../utils/errores');
const { validarFecha, validarUuid } = require('../movimientos/movimientos.validation');

function validarNombre(nombre) {
  if (typeof nombre !== 'string' || !nombre.trim()) throw new ErrorValidacion('El nombre es obligatorio');
  const limpio = nombre.trim();
  if (limpio.length > 100) throw new ErrorValidacion('El nombre es demasiado largo');
  return limpio;
}

function validarFechaLimite(fecha) {
  return fecha === null ? null : validarFecha(fecha);
}

// El grupo de una meta no se cambia después de crearla.
function rechazarGrupo(body) {
  if (body.grupoId !== undefined && body.grupoId !== null) {
    throw new ErrorValidacion('El grupo de una meta no se puede cambiar');
  }
}

function validarCrear(body = {}) {
  return {
    grupoId: body.grupoId === undefined || body.grupoId === null ? null : validarUuid(body.grupoId, 'grupoId'),
    nombre: validarNombre(body.nombre),
    montoObjetivo: validarMonto(body.montoObjetivo),
    fechaLimite: body.fechaLimite === undefined ? null : validarFechaLimite(body.fechaLimite),
  };
}

function validarEditar(body = {}) {
  rechazarGrupo(body);
  const datos = {};
  if (body.nombre !== undefined) datos.nombre = validarNombre(body.nombre);
  if (body.montoObjetivo !== undefined) datos.montoObjetivo = validarMonto(body.montoObjetivo);
  if (body.fechaLimite !== undefined) datos.fechaLimite = validarFechaLimite(body.fechaLimite);
  return datos;
}

// Un retiro se registra con monto negativo ("-1000.00").
function validarMontoAporte(valor) {
  if (typeof valor !== 'string' && typeof valor !== 'number') {
    throw new ErrorValidacion('El monto debe ser un número');
  }
  const texto = String(valor).trim();
  return texto.startsWith('-') ? `-${validarMonto(texto.slice(1))}` : validarMonto(texto);
}

function validarAporte(body = {}) {
  return { monto: validarMontoAporte(body.monto), fecha: validarFecha(body.fecha) };
}

module.exports = { validarCrear, validarEditar, validarAporte };
