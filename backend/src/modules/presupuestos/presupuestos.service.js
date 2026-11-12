const { Op } = require('sequelize');
const { Presupuesto, Movimiento, Categoria, ParticipacionGasto } = require('../../db/models');
const { ErrorNoEncontrado, ErrorValidacion } = require('../../utils/errores');
const { sumar } = require('../../utils/dinero');
const { rangoDelMes, verificarCategoria } = require('../movimientos/movimientos.service');
const { calcularEstado } = require('./presupuestos.calculo');
const { registrarAlertaPresupuesto } = require('../notificaciones/notificaciones.service');

const REGLAS_PERMITIDAS = ['solo_personal', 'con_compartidos'];

async function upsertPresupuesto(usuarioId, { categoriaId, mes, montoLimite, regla = 'solo_personal', moneda = 'ARS' }) {
  if (!REGLAS_PERMITIDAS.includes(regla)) throw new ErrorValidacion('Regla de presupuesto no permitida');
  await verificarCategoria(usuarioId, categoriaId);
  const existente = await Presupuesto.findOne({ where: { usuarioId, categoriaId, mes, moneda } });
  if (existente) {
    Object.assign(existente, { montoLimite, regla });
    await existente.save();
    return existente;
  }
  return Presupuesto.create({ usuarioId, categoriaId, mes, montoLimite, regla, moneda });
}

async function listarPresupuestos(usuarioId, mes) {
  return Presupuesto.findAll({ where: { usuarioId, mes }, order: [['createdAt', 'ASC'], ['id', 'ASC']] });
}

async function eliminarPresupuesto(usuarioId, id) {
  const p = await Presupuesto.findOne({ where: { id, usuarioId } });
  if (!p) throw new ErrorNoEncontrado('Presupuesto no encontrado');
  await p.destroy();
}

// Consumo de todos los presupuestos del mes con dos consultas en total (antes, dos por presupuesto).
// Se filtra por categoría y moneda de cada presupuesto.
async function consumosDelMes(usuarioId, presupuestos, mes) {
  const fecha = { [Op.between]: rangoDelMes(mes) };
  const categoriaIds = [...new Set(presupuestos.map((p) => p.categoriaId))];
  const personales = await Movimiento.findAll({
    where: { usuarioId, tipo: 'gasto', alcance: 'personal', fecha, categoriaId: categoriaIds },
    attributes: ['monto', 'categoriaId', 'moneda'],
  });
  const conCompartidos = presupuestos.some((p) => p.regla === 'con_compartidos');
  const partes = conCompartidos
    ? await ParticipacionGasto.findAll({
      where: { usuarioId, categoriaId: categoriaIds },
      attributes: ['monto', 'categoriaId'],
      include: [{ model: Movimiento, required: true, attributes: ['moneda'], where: { tipo: 'gasto', alcance: 'compartido', fecha } }],
    })
    : [];
  return presupuestos.map((p) => {
    const montos = personales
      .filter((g) => g.categoriaId === p.categoriaId && g.moneda === p.moneda)
      .map((g) => g.monto);
    if (p.regla === 'con_compartidos') {
      montos.push(...partes
        .filter((x) => x.categoriaId === p.categoriaId && x.Movimiento.moneda === p.moneda)
        .map((x) => x.monto));
    }
    return sumar(montos);
  });
}

// Solo lectura: no registra alertas.
async function calcularEstadosPresupuestos(usuarioId, mes) {
  const presupuestos = await listarPresupuestos(usuarioId, mes);
  if (presupuestos.length === 0) return [];
  const consumos = await consumosDelMes(usuarioId, presupuestos, mes);
  return presupuestos.map((p, i) => {
    const consumido = consumos[i];
    return {
      id: p.id,
      categoriaId: p.categoriaId,
      mes: p.mes,
      moneda: p.moneda,
      regla: p.regla,
      montoLimite: p.montoLimite,
      consumido,
      ...calcularEstado({ montoLimite: p.montoLimite, consumido }),
    };
  });
}

// Solo lectura (CQS, M-01): consultar el estado nunca escribe. Los avisos se registran en revisarAlertas,
// que se llama después de cada cambio en los gastos.
async function estadoPresupuestos(usuarioId, mes) {
  return calcularEstadosPresupuestos(usuarioId, mes);
}

// Después de crear o editar un gasto (personal, compartido o pago de cuota) o de definir un presupuesto,
// revisa los presupuestos de los meses afectados y registra los avisos del 80 % y del 100 %.
// Un aviso ya registrado no se duplica. Nunca hace fallar la operación que lo disparó.
async function revisarAlertas(usuarioIds, fechas) {
  const meses = [...new Set(fechas.filter(Boolean).map((f) => String(f).slice(0, 7)))];
  for (const usuarioId of new Set(usuarioIds.filter(Boolean))) {
    for (const mes of meses) {
      try {
        await registrarAlertas(usuarioId, await calcularEstadosPresupuestos(usuarioId, mes));
      } catch (err) {
        console.error('No se pudieron revisar las alertas de presupuesto:', err.name);
      }
    }
  }
}

// Una falla al registrar alertas nunca debe romper la consulta de presupuestos.
async function registrarAlertas(usuarioId, estados) {
  const conAlerta = estados.filter((e) => e.alerta);
  if (conAlerta.length === 0) return;
  try {
    const categorias = await Categoria.findAll({ where: { id: conAlerta.map((e) => e.categoriaId) } });
    for (const e of conAlerta) {
      const nombre = categorias.find((c) => c.id === e.categoriaId)?.nombre ?? 'una categoría';
      const mensaje = e.alerta === '100'
        ? `Superaste el presupuesto de ${nombre} de ${e.mes}.`
        : `Llegaste al 80% del presupuesto de ${nombre} de ${e.mes}.`;
      await registrarAlertaPresupuesto(usuarioId, e.id, e.alerta, mensaje);
    }
  } catch (err) {
    console.error('No se pudieron registrar las alertas de presupuesto:', err.name);
  }
}

module.exports = { calcularEstadosPresupuestos, upsertPresupuesto, listarPresupuestos, eliminarPresupuesto, estadoPresupuestos, revisarAlertas };
