const { sequelize } = require('../../db/sequelize');
const { Compra, Movimiento } = require('../../db/models');
const { dividirEnPartes } = require('../../utils/dinero');
const { mesDeCuota, diaValido } = require('../../utils/fechas');
const { verificarCategoria } = require('../movimientos/movimientos.service');
const { obtenerPropia } = require('./tarjetas.service');
const { ErrorValidacion } = require('../../utils/errores');

// El sufijo " (n/N)" se agrega a la descripción y todo debe entrar en STRING(255).
const MAX_DESCRIPCION_COMPRA = 200;

// fecha es YYYY-MM-DD (calendario); se interpreta al mediodía de Buenos Aires (UTC-3).
const aInstante = (fecha) => new Date(`${fecha}T12:00:00-03:00`);

// Fecha del movimiento de una cuota: el día de cierre del mes de resumen, para que el
// período (que incluye el día de cierre) la ubique en ese mes.
function fechaCuota(mes, diaCierre) {
  const [anio, m] = mes.split('-').map(Number);
  return `${mes}-${String(diaValido(anio, m, diaCierre)).padStart(2, '0')}`;
}

async function crearCompra(usuarioId, tarjetaId, datos) {
  const { montoTotal, cuotas, modalidad, fecha, categoriaId = null, descripcion = null } = datos;
  if (descripcion && descripcion.length > MAX_DESCRIPCION_COMPRA) {
    throw new ErrorValidacion(`La descripción no puede superar ${MAX_DESCRIPCION_COMPRA} caracteres`);
  }
  const tarjeta = await obtenerPropia(usuarioId, tarjetaId);
  await verificarCategoria(usuarioId, categoriaId);

  const base = { usuarioId, tarjetaId, tipo: 'gasto', alcance: 'personal', categoriaId };
  let filas;
  if (modalidad === 'por_cuota') {
    filas = dividirEnPartes(montoTotal, cuotas).map((monto, i) => ({
      ...base,
      monto,
      fecha: fechaCuota(mesDeCuota(aInstante(fecha), tarjeta.diaCierre, i + 1), tarjeta.diaCierre),
      descripcion: `${descripcion || 'Compra'} (${i + 1}/${cuotas})`,
    }));
  } else {
    // compra_completa: un solo movimiento por el total, en el mes de la fecha de compra.
    filas = [{ ...base, monto: montoTotal, fecha, descripcion }];
  }

  return sequelize.transaction(async (transaction) => {
    const compra = await Compra.create(
      { usuarioId, tarjetaId, montoTotal, cuotas, modalidad, fecha },
      { transaction }
    );
    const movimientos = await Movimiento.bulkCreate(
      filas.map((f) => ({ ...f, compraId: compra.id })),
      { transaction }
    );
    return { compra, movimientos };
  });
}

module.exports = { crearCompra };
