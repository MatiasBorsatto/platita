const { Op } = require('sequelize');
const { CuotaGastoFijo, GastoFijo, MiembroGrupo, ConceptoGastoFijo } = require('../../db/models');
const { sumar } = require('../../utils/dinero');
const { hoyBA } = require('../../utils/fechas');
const { puede } = require('../autorizacion/autorizacion.service');
const { PERMISOS } = require('../autorizacion/permisos');

// Deudas: cuotas de gastos fijos sin pagar. Una cuota con vencimiento anterior a hoy está vencida.
// Propios: los del usuario. De grupo: los de los grupos del usuario, si puede ver los gastos del grupo.
async function listarDeudas(usuarioId) {
  const hoy = hoyBA().slice(0, 10);
  const membresias = await MiembroGrupo.findAll({ where: { usuarioId }, attributes: ['grupoId'] });
  const grupoIds = membresias.map((m) => m.grupoId);

  const cuotas = await CuotaGastoFijo.findAll({
    where: { estado: 'pendiente' },
    include: [{
      model: GastoFijo,
      required: true,
      attributes: ['id', 'nombre', 'moneda', 'ambito', 'grupoId', 'usuarioId'],
      where: grupoIds.length
        ? { [Op.or]: [{ usuarioId }, { ambito: 'grupo', grupoId: grupoIds }] }
        : { usuarioId },
    }, {
      model: ConceptoGastoFijo,
      as: 'concepto',
      required: true,
      attributes: ['cuotas', 'nombre'],
    }],
    order: [['fechaVencimiento', 'ASC'], ['id', 'ASC']],
  });

  const mesHoy = hoy.slice(0, 7);
  const visibles = [];
  // El permiso depende solo del grupo: se calcula una vez por grupo, no una vez por cuota (M-02).
  const permisoPorGrupo = new Map();
  const puedeVerGrupo = async (grupoId) => {
    if (!permisoPorGrupo.has(grupoId)) permisoPorGrupo.set(grupoId, await puede(usuarioId, PERMISOS.GASTOS_VER_GRUPO, { grupoId }));
    return permisoPorGrupo.get(grupoId);
  };
  for (const c of cuotas) {
    const gasto = c.GastoFijo;
    // Un gasto recurrente todavía no es deuda en meses futuros, aunque ya exista la cuota
    // porque alguien consultó ese mes. Las cuotas de un concepto finito sí lo son.
    if (c.concepto.cuotas === null && c.mes > mesHoy) continue;
    if (gasto.usuarioId !== usuarioId) {
      // Gasto de otro integrante del grupo: solo si este usuario puede ver los gastos del grupo.
      if (!(await puedeVerGrupo(gasto.grupoId))) continue;
    }
    visibles.push({
      id: c.id,
      gastoId: gasto.id,
      nombre: gasto.nombre,
      concepto: c.concepto.nombre,
      ambito: gasto.ambito,
      mes: c.mes,
      monto: c.monto,
      moneda: gasto.moneda,
      fechaVencimiento: c.fechaVencimiento,
      vencida: c.fechaVencimiento < hoy,
      // Las cuotas las paga quien creó el gasto fijo (también en los de grupo).
      puedePagar: gasto.usuarioId === usuarioId,
    });
  }

  return { deudas: visibles, totales: totalesPorMoneda(visibles) };
}

// Totales separados por moneda. Nunca se convierte entre monedas.
function totalesPorMoneda(deudas) {
  const porMoneda = new Map();
  for (const d of deudas) {
    if (!porMoneda.has(d.moneda)) porMoneda.set(d.moneda, { pendiente: [], vencido: [] });
    const grupo = porMoneda.get(d.moneda);
    grupo.pendiente.push(d.monto);
    if (d.vencida) grupo.vencido.push(d.monto);
  }
  return [...porMoneda].map(([moneda, { pendiente, vencido }]) => ({
    moneda,
    pendiente: sumar(pendiente),
    vencido: vencido.length ? sumar(vencido) : '0.00',
  }));
}

module.exports = { listarDeudas, totalesPorMoneda };
