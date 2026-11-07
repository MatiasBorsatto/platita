const { Op } = require('sequelize');
const { CuotaGastoFijo, GastoFijo, MiembroGrupo } = require('../../db/models');
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
    }],
    order: [['fechaVencimiento', 'ASC'], ['id', 'ASC']],
  });

  const visibles = [];
  for (const c of cuotas) {
    const gasto = c.GastoFijo;
    if (gasto.usuarioId !== usuarioId) {
      // Gasto de otro integrante del grupo: solo si este usuario puede ver los gastos del grupo.
      if (!(await puede(usuarioId, PERMISOS.GASTOS_VER_GRUPO, { grupoId: gasto.grupoId }))) continue;
    }
    visibles.push({
      id: c.id,
      gastoId: gasto.id,
      nombre: gasto.nombre,
      ambito: gasto.ambito,
      mes: c.mes,
      monto: c.monto,
      moneda: gasto.moneda,
      fechaVencimiento: c.fechaVencimiento,
      vencida: c.fechaVencimiento < hoy,
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
