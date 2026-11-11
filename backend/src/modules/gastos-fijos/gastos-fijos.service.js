const { Op } = require('sequelize');
const { sequelize } = require('../../db/sequelize');
const {
  GastoFijo,
  ConceptoGastoFijo,
  CuotaGastoFijo,
  Movimiento,
} = require('../../db/models');
const { aCentavos, deCentavos, sumar } = require('../../utils/dinero');
const { hoyBA, diaValido } = require('../../utils/fechas');
const { ErrorValidacion, ErrorNoEncontrado } = require('../../utils/errores');
const { verificarCategoria, rangoDelMes } = require('../movimientos/movimientos.service');
const { registrarAlertaVencimiento } = require('../notificaciones/notificaciones.service');
const {
  fechaVencimiento,
  mesCuota,
  cuotasFinanciadas,
  montoMensualConcepto,
  situacionCuota,
} = require('./gastos-fijos.calculo');

async function obtenerPropio(usuarioId, id, { incluirArchivado = false } = {}) {
  const where = { id, usuarioId };
  if (!incluirArchivado) where.archivado = false;
  const gasto = await GastoFijo.findOne({ where });
  if (!gasto) throw new ErrorNoEncontrado('Gasto fijo no encontrado');
  return gasto;
}

async function obtenerConcepto(usuarioId, gastoFijoId, conceptoId) {
  const gasto = await obtenerPropio(usuarioId, gastoFijoId);
  const concepto = await ConceptoGastoFijo.findOne({
    where: { id: conceptoId, gastoFijoId: gasto.id },
  });
  if (!concepto) throw new ErrorNoEncontrado('Concepto no encontrado');
  return { gasto, concepto };
}

function cantidadMeses(desde, hasta) {
  const [a1, m1] = desde.split('-').map(Number);
  const [a2, m2] = hasta.split('-').map(Number);
  return a2 * 12 + m2 - (a1 * 12 + m1);
}

function dtoConcepto(concepto, cuotas = []) {
  const j = concepto.toJSON ? concepto.toJSON() : concepto;
  const pagadas = cuotas.filter((c) => c.estado === 'pagado').length;
  return {
    ...j,
    montoTotal: String(j.montoTotal),
    montoCuota: montoMensualConcepto(j),
    cuotasPagadas: pagadas,
    cuotasTotales: j.cuotas ?? null,
  };
}

function dtoCuota(cuota) {
  const j = cuota.toJSON ? cuota.toJSON() : cuota;
  const concepto = j.concepto || {};
  const gasto = j.gasto || j.GastoFijo || {};
  const numero =
    concepto.cuotas && concepto.mesInicio
      ? cantidadMeses(concepto.mesInicio, j.mes) + 1
      : null;
  return {
    id: j.id,
    gastoFijoId: j.gastoFijoId,
    gastoNombre: gasto.nombre || null,
    categoriaId: gasto.categoriaId ?? null,
    diaVencimiento: gasto.diaVencimiento ?? null,
    conceptoId: j.conceptoId,
    conceptoNombre: concepto.nombre || null,
    cuotas: concepto.cuotas ?? null,
    numeroCuota: numero,
    mes: j.mes,
    monto: String(j.monto),
    fechaVencimiento: j.fechaVencimiento,
    estado: j.estado,
    situacion: situacionCuota(j, hoyBA()),
    pagadoEn: j.pagadoEn,
    movimientoId: j.movimientoId,
  };
}

// Cuotas del concepto que no se pueden recalcular: ya están pagadas o vencidas.
function seConserva(cuota, hoy) {
  return cuota.estado === 'pagado' || cuota.fechaVencimiento < hoy;
}

async function generarCuotasDeConcepto(concepto, { transaction, hasta = null, mesesAtras = 12 } = {}) {
  const gasto = await GastoFijo.findByPk(concepto.gastoFijoId, { transaction });
  const hoy = hoyBA();
  const mesHoy = hoy.slice(0, 7);

  if (concepto.cuotas === null || concepto.cuotas === undefined) {
    if (concepto.mesInicio > (hasta || mesHoy)) return;
    let [anio, mes] = concepto.mesInicio.split('-').map(Number);
    let inicio = concepto.mesInicio;
    if (hasta) {
      const [ha, hm] = hasta.split('-').map(Number);
      const limiteAtras = ha * 12 + hm - mesesAtras;
      const inicioIdx = anio * 12 + mes - 1;
      if (inicioIdx < limiteAtras) {
        const idx = limiteAtras;
        inicio = `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
      }
    }
    let [ia, im] = inicio.split('-').map(Number);
    const [ta, tm] = (hasta || mesHoy).split('-').map(Number);
    while (ia * 12 + im <= ta * 12 + tm) {
      const m = `${ia}-${String(im).padStart(2, '0')}`;
      await CuotaGastoFijo.findOrCreate({
        where: { conceptoId: concepto.id, mes: m },
        defaults: {
          gastoFijoId: concepto.gastoFijoId,
          conceptoId: concepto.id,
          usuarioId: gasto.usuarioId,
          mes: m,
          monto: concepto.montoTotal,
          fechaVencimiento: fechaVencimiento(m, gasto.diaVencimiento),
          estado: 'pendiente',
        },
        transaction,
      });
      if (im === 12) {
        ia += 1;
        im = 1;
      } else {
        im += 1;
      }
    }
    return;
  }

  const filas = cuotasFinanciadas({
    montoTotal: concepto.montoTotal,
    cuotas: concepto.cuotas,
    mesInicio: concepto.mesInicio,
    diaVencimiento: gasto.diaVencimiento,
  });
  for (const f of filas) {
    // Las cuotas vencidas también se crean: se muestran como deuda en el módulo Deudas.
    await CuotaGastoFijo.findOrCreate({
      where: { conceptoId: concepto.id, mes: f.mes },
      defaults: {
        gastoFijoId: concepto.gastoFijoId,
        conceptoId: concepto.id,
        usuarioId: gasto.usuarioId,
        mes: f.mes,
        monto: f.monto,
        fechaVencimiento: f.fechaVencimiento,
        estado: 'pendiente',
      },
      transaction,
    });
  }
}

async function listarGastosFijos(usuarioId) {
  const gastos = await GastoFijo.findAll({
    where: { usuarioId, archivado: false },
    include: [{
      model: ConceptoGastoFijo,
      as: 'conceptos',
      required: false,
      where: { archivado: false },
    }],
    order: [['nombre', 'ASC'], ['id', 'ASC']],
    distinct: true,
  });
  const ids = gastos.map((g) => g.id);
  const cuotas = ids.length
    ? await CuotaGastoFijo.findAll({ where: { gastoFijoId: ids } })
    : [];
  const porConcepto = new Map();
  for (const c of cuotas) {
    if (!porConcepto.has(c.conceptoId)) porConcepto.set(c.conceptoId, []);
    porConcepto.get(c.conceptoId).push(c);
  }
  const hoy = hoyBA();
  const mesHoy = hoy.slice(0, 7);
  return gastos.map((g) => {
    const j = g.toJSON();
    const conceptos = (j.conceptos || []).map((c) =>
      dtoConcepto(c, porConcepto.get(c.id) || [])
    );
    const idsConceptos = new Set(conceptos.map((c) => c.id));
    const cuotasMes = cuotas.filter((c) => c.mes === mesHoy && idsConceptos.has(c.conceptoId));
    const pendientes = cuotas.filter((c) => c.estado === 'pendiente' && idsConceptos.has(c.conceptoId));
    const proximo = pendientes
      .map((c) => c.fechaVencimiento)
      .filter((f) => f >= hoy)
      .sort()[0] || null;

    // Monto que corresponde este mes a cada concepto. Un concepto finito solo
    // cuenta mientras esté dentro de su cantidad de cuotas.
    const montoDelMes = (concepto) => {
      let indice = 0;
      if (concepto.cuotas !== null) {
        indice = cantidadMeses(concepto.mesInicio, mesHoy);
        if (indice < 0 || indice >= concepto.cuotas) return null;
      } else if (concepto.mesInicio > mesHoy) {
        return null;
      }
      const cuota = cuotas.find((c) => c.conceptoId === concepto.id && c.mes === mesHoy);
      return cuota ? String(cuota.monto) : concepto.montoCuota;
    };
    const totalMes = sumar(conceptos.map(montoDelMes).filter((m) => m !== null));
    return {
      ...j,
      conceptos,
      resumen: {
        totalMes,
        pendientes: pendientes.length,
        proximoVencimiento: proximo,
        cuotasMes: cuotasMes.length,
      },
    };
  });
}

async function crearGastoFijo(usuarioId, datos) {
  await verificarCategoria(usuarioId, datos.categoriaId);
  const gasto = await GastoFijo.create({ ...datos, usuarioId });
  if (datos.conceptos && datos.conceptos.length) {
    for (const c of datos.conceptos) await crearConcepto(usuarioId, gasto.id, c);
  }
  return obtenerGastoFijo(usuarioId, gasto.id);
}

async function editarGastoFijo(usuarioId, id, datos) {
  const gasto = await obtenerPropio(usuarioId, id, { incluirArchivado: true });
  await verificarCategoria(usuarioId, datos.categoriaId);
  const hoy = hoyBA();
  const cambiaDia =
    datos.diaVencimiento !== undefined && Number(datos.diaVencimiento) !== gasto.diaVencimiento;
  await sequelize.transaction(async (transaction) => {
    await gasto.update(datos, { transaction });
    if (cambiaDia) {
      const pendientes = await CuotaGastoFijo.findAll({
        where: { gastoFijoId: gasto.id, estado: 'pendiente', fechaVencimiento: { [Op.gte]: hoy } },
        transaction,
      });
      for (const cuota of pendientes) {
        const [anio, mes] = cuota.mes.split('-').map(Number);
        await cuota.update(
          { fechaVencimiento: `${cuota.mes}-${String(diaValido(anio, mes, gasto.diaVencimiento)).padStart(2, '0')}` },
          { transaction }
        );
      }
    }
  });
  return obtenerGastoFijo(usuarioId, gasto.id);
}

async function eliminarGastoFijo(usuarioId, id) {
  const gasto = await obtenerPropio(usuarioId, id, { incluirArchivado: true });
  const pagadas = await CuotaGastoFijo.count({
    where: { gastoFijoId: gasto.id, estado: 'pagado' },
  });
  const movimientos = await Movimiento.count({ where: { gastoFijoId: gasto.id } });
  if (pagadas > 0 || movimientos > 0) {
    await gasto.update({ archivado: true });
    return { archivado: true };
  }
  await sequelize.transaction(async (transaction) => {
    await CuotaGastoFijo.destroy({ where: { gastoFijoId: gasto.id }, transaction });
    await ConceptoGastoFijo.destroy({ where: { gastoFijoId: gasto.id }, transaction });
    await gasto.destroy({ transaction });
  });
  return { archivado: false };
}

async function crearConcepto(usuarioId, gastoFijoId, datos) {
  const gasto = await obtenerPropio(usuarioId, gastoFijoId);
  const concepto = await ConceptoGastoFijo.create({
    gastoFijoId: gasto.id,
    nombre: datos.nombre,
    montoTotal: datos.montoTotal,
    cuotas: datos.cuotas ?? null,
    mesInicio: datos.mesInicio,
  });
  await sequelize.transaction(async (transaction) => {
    await generarCuotasDeConcepto(concepto, { transaction });
  });
  const cuotas = await CuotaGastoFijo.findAll({ where: { conceptoId: concepto.id } });
  return dtoConcepto(concepto, cuotas);
}

async function editarConcepto(usuarioId, gastoFijoId, conceptoId, datos) {
  const { gasto, concepto } = await obtenerConcepto(usuarioId, gastoFijoId, conceptoId);
  const hoy = hoyBA();
  const cambiaMonto = datos.montoTotal !== undefined && String(datos.montoTotal) !== String(concepto.montoTotal);
  const cambiaCuotas = datos.cuotas !== undefined && datos.cuotas !== concepto.cuotas;
  const archiva = datos.archivado === true && concepto.archivado === false;

  await sequelize.transaction(async (transaction) => {
    await concepto.update(datos, { transaction });
    if (archiva) {
      await CuotaGastoFijo.destroy({
        where: { conceptoId: concepto.id, estado: 'pendiente' },
        transaction,
      });
      return;
    }
    if (concepto.archivado) return;

    if (cambiaMonto || cambiaCuotas) {
      if (concepto.cuotas === null || concepto.cuotas === undefined) {
        // Recurrente: solo cambia el monto de los vencimientos que todavía no ocurrieron.
        await CuotaGastoFijo.update(
          { monto: concepto.montoTotal },
          {
            where: {
              conceptoId: concepto.id,
              estado: 'pendiente',
              fechaVencimiento: { [Op.gt]: hoy },
            },
            transaction,
          }
        );
      } else {
        // Finito: las cuotas pagadas o vencidas son historial y no se recalculan.
        await CuotaGastoFijo.destroy({
          where: {
            conceptoId: concepto.id,
            estado: 'pendiente',
            fechaVencimiento: { [Op.gt]: hoy },
          },
          transaction,
        });
        const filas = cuotasFinanciadas({
          montoTotal: concepto.montoTotal,
          cuotas: concepto.cuotas,
          mesInicio: concepto.mesInicio,
          diaVencimiento: gasto.diaVencimiento,
        });
        for (const f of filas) {
          if (f.fechaVencimiento <= hoy) continue;
          await CuotaGastoFijo.findOrCreate({
            where: { conceptoId: concepto.id, mes: f.mes },
            defaults: {
              gastoFijoId: concepto.gastoFijoId,
              conceptoId: concepto.id,
              usuarioId: gasto.usuarioId,
              mes: f.mes,
              monto: f.monto,
              fechaVencimiento: f.fechaVencimiento,
              estado: 'pendiente',
            },
            transaction,
          });
        }
      }
    }
  });

  const cuotas = await CuotaGastoFijo.findAll({ where: { conceptoId: concepto.id } });
  return dtoConcepto(concepto, cuotas);
}

async function eliminarConcepto(usuarioId, gastoFijoId, conceptoId) {
  const { concepto } = await obtenerConcepto(usuarioId, gastoFijoId, conceptoId);
  const pagadas = await CuotaGastoFijo.count({
    where: { conceptoId: concepto.id, estado: 'pagado' },
  });
  if (pagadas > 0) {
    await sequelize.transaction(async (transaction) => {
      await concepto.update({ archivado: true }, { transaction });
      await CuotaGastoFijo.destroy({
        where: { conceptoId: concepto.id, estado: 'pendiente' },
        transaction,
      });
    });
    return { archivado: true };
  }
  await concepto.destroy();
  return { archivado: false };
}

async function asegurarCuotas(usuarioId, { hasta, mesesAtras } = {}) {
  const gastos = await GastoFijo.findAll({
    where: { usuarioId, archivado: false },
    include: [{
      model: ConceptoGastoFijo,
      as: 'conceptos',
      required: true,
      where: { archivado: false },
    }],
  });
  await sequelize.transaction(async (transaction) => {
    for (const gasto of gastos) {
      for (const concepto of gasto.conceptos) {
        await generarCuotasDeConcepto(concepto, { transaction, hasta, mesesAtras });
      }
    }
  });
}

async function listarVencimientos(usuarioId, mes) {
  await asegurarCuotas(usuarioId, { hasta: mes, mesesAtras: 24 });
  const cuotas = await CuotaGastoFijo.findAll({
    where: { usuarioId, mes },
    include: [
      { model: GastoFijo, required: true, where: { archivado: false } },
      {
        model: ConceptoGastoFijo,
        as: 'concepto',
        required: true,
        where: { archivado: false },
      },
    ],
    order: [['fechaVencimiento', 'ASC'], ['createdAt', 'ASC'], ['id', 'ASC']],
  });
  return cuotas.map(dtoCuota);
}

async function recordatorios(usuarioId) {
  const hoy = hoyBA();
  const mesHoy = hoy.slice(0, 7);
  await asegurarCuotas(usuarioId, { hasta: mesHoy, mesesAtras: 12 });
  const finMes = rangoDelMes(mesHoy)[1];
  const cuotas = await CuotaGastoFijo.findAll({
    where: {
      usuarioId,
      estado: 'pendiente',
      fechaVencimiento: { [Op.lte]: finMes },
    },
    include: [
      { model: GastoFijo, required: true, where: { archivado: false } },
      {
        model: ConceptoGastoFijo,
        as: 'concepto',
        required: true,
        where: { archivado: false },
      },
    ],
    order: [['fechaVencimiento', 'ASC'], ['id', 'ASC']],
  });
  const avisos = [];
  for (const cuota of cuotas) {
    const dto = dtoCuota(cuota);
    if (dto.situacion !== 'vencido' && dto.situacion !== 'proximo') continue;
    const mensaje =
      dto.situacion === 'vencido'
        ? `Venció el pago de ${dto.gastoNombre} - ${dto.conceptoNombre} ($${dto.monto})`
        : `Tenemos que pagar ${dto.gastoNombre} - ${dto.conceptoNombre} antes del ${dto.fechaVencimiento}`;
    await registrarAlertaVencimiento(usuarioId, cuota.id, dto.situacion, mensaje);
    avisos.push(dto);
  }
  return avisos;
}

async function obtenerGastoFijo(usuarioId, id, mes = null) {
  const gasto = await GastoFijo.findOne({
    where: { id, usuarioId },
    include: [{
      model: ConceptoGastoFijo,
      as: 'conceptos',
      required: false,
      where: { archivado: false },
    }],
    order: [[{ model: ConceptoGastoFijo, as: 'conceptos' }, 'createdAt', 'ASC']],
  });
  if (!gasto) throw new ErrorNoEncontrado('Gasto fijo no encontrado');
  if (mes) await asegurarCuotas(usuarioId, { hasta: mes, mesesAtras: 24 });
  const where = { gastoFijoId: id };
  if (mes) where.mes = mes;
  const cuotas = await CuotaGastoFijo.findAll({
    where,
    include: [{ model: ConceptoGastoFijo, as: 'concepto', required: true }],
    order: [['mes', 'ASC'], ['fechaVencimiento', 'ASC'], ['id', 'ASC']],
  });
  const porConcepto = new Map();
  for (const c of cuotas) {
    if (!porConcepto.has(c.conceptoId)) porConcepto.set(c.conceptoId, []);
    porConcepto.get(c.conceptoId).push(c);
  }
  const j = gasto.toJSON();
  return {
    ...j,
    conceptos: (j.conceptos || []).map((c) => dtoConcepto(c, porConcepto.get(c.id) || [])),
    cuotas: cuotas.map(dtoCuota),
  };
}

async function pagarCuota(usuarioId, gastoFijoId, cuotaId, { fecha } = {}) {
  const gasto = await obtenerPropio(usuarioId, gastoFijoId);
  const cuota = await CuotaGastoFijo.findOne({
    where: { id: cuotaId, gastoFijoId: gasto.id },
    include: [{ model: ConceptoGastoFijo, as: 'concepto', required: true }],
  });
  if (!cuota) throw new ErrorNoEncontrado('Cuota no encontrada');
  if (cuota.estado === 'pagado') throw new ErrorValidacion('La cuota ya está pagada');

  const fechaPago = fecha || hoyBA();
  const concepto = cuota.concepto;
  let descripcion = `${gasto.nombre} - ${concepto.nombre}`;
  if (concepto.cuotas) {
    const numero = cantidadMeses(concepto.mesInicio, cuota.mes) + 1;
    descripcion += ` (${numero}/${concepto.cuotas})`;
  } else {
    descripcion += ` (${cuota.mes})`;
  }
  descripcion = descripcion.slice(0, 255);

  const resultado = await sequelize.transaction(async (transaction) => {
    const movimiento = await Movimiento.create(
      {
        usuarioId,
        tipo: 'gasto',
        alcance: 'personal',
        monto: cuota.monto,
        moneda: gasto.moneda,
        fecha: fechaPago,
        descripcion,
        categoriaId: gasto.categoriaId,
        gastoFijoId: gasto.id,
      },
      { transaction }
    );
    await cuota.update(
      { estado: 'pagado', pagadoEn: new Date(), movimientoId: movimiento.id },
      { transaction }
    );
    return movimiento;
  });
  return {
    cuota: {
      ...dtoCuota(cuota),
      gastoNombre: gasto.nombre,
      categoriaId: gasto.categoriaId,
    },
    movimiento: resultado.toJSON(),
  };
}

async function deshacerPago(usuarioId, gastoFijoId, cuotaId) {
  const gasto = await obtenerPropio(usuarioId, gastoFijoId);
  const cuota = await CuotaGastoFijo.findOne({ where: { id: cuotaId, gastoFijoId: gasto.id } });
  if (!cuota) throw new ErrorNoEncontrado('Cuota no encontrada');
  if (cuota.estado !== 'pagado') throw new ErrorValidacion('La cuota no está pagada');
  await sequelize.transaction(async (transaction) => {
    if (cuota.movimientoId) {
      await Movimiento.destroy({
        where: { id: cuota.movimientoId, gastoFijoId: gasto.id, usuarioId },
        transaction,
      });
    }
    await cuota.update(
      { estado: 'pendiente', pagadoEn: null, movimientoId: null },
      { transaction }
    );
  });
  return { cuota: dtoCuota(cuota) };
}

module.exports = {
  listarGastosFijos,
  crearGastoFijo,
  obtenerGastoFijo,
  editarGastoFijo,
  eliminarGastoFijo,
  crearConcepto,
  editarConcepto,
  eliminarConcepto,
  listarVencimientos,
  recordatorios,
  pagarCuota,
  deshacerPago,
};
