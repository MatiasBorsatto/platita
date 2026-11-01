const { Movimiento, MiembroGrupo, ParticipacionGasto, PagoEntreMiembros, Usuario } = require('../../db/models');
const { aCentavos, deCentavos } = require('../../utils/dinero');
const { ErrorValidacion } = require('../../utils/errores');
const { calcularSaldos } = require('./saldos.calculo');

// Suma exacta por clave: filas con `monto` -> { clave: 'monto' }
function agrupar(filas, claveDe) {
  const acc = {};
  for (const f of filas) {
    const k = claveDe(f);
    acc[k] = (acc[k] === undefined ? 0n : acc[k]) + aCentavos(f.monto);
  }
  return Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, deCentavos(v)]));
}

// El llamador ya verificó que el usuario es miembro del grupo (grupoAccesible).
async function saldosDelGrupo(usuarioId, grupoId) {
  const movs = await Movimiento.findAll({
    where: { grupoId, alcance: 'compartido', tipo: 'gasto' },
    attributes: ['id', 'pagadorId', 'monto'],
  });
  const participaciones = movs.length
    ? await ParticipacionGasto.findAll({ where: { movimientoId: movs.map((m) => m.id) } })
    : [];
  const pagos = await PagoEntreMiembros.findAll({ where: { grupoId } });
  const miembros = await MiembroGrupo.findAll({
    where: { grupoId },
    order: [['createdAt', 'ASC'], ['id', 'ASC']],
  });

  const saldos = calcularSaldos({
    pagadoPorUsuario: agrupar(movs.filter((m) => m.pagadorId), (m) => m.pagadorId),
    participacionPorUsuario: agrupar(participaciones, (p) => p.usuarioId),
    pagosRealizados: agrupar(pagos, (p) => p.deudorId),
    pagosRecibidos: agrupar(pagos, (p) => p.acreedorId),
  });

  const ids = [...new Set([...miembros.map((m) => m.usuarioId), ...saldos.keys()])];
  const usuarios = await Usuario.findAll({ where: { id: ids }, attributes: ['id', 'nombre'] });
  const nombres = Object.fromEntries(usuarios.map((u) => [u.id, u.nombre]));
  return ids.map((id) => ({ usuarioId: id, nombre: nombres[id] ?? null, saldo: saldos.get(id) ?? '0.00' }));
}

async function registrarPago(usuarioId, grupoId, { deudorId, acreedorId, monto, fecha, nota = null }) {
  if (deudorId === acreedorId) throw new ErrorValidacion('El deudor y el acreedor deben ser distintos');
  for (const id of [deudorId, acreedorId]) {
    if (!(await MiembroGrupo.findOne({ where: { grupoId, usuarioId: id } }))) {
      throw new ErrorValidacion('El deudor y el acreedor deben ser miembros del grupo');
    }
  }
  const pago = await PagoEntreMiembros.create({ grupoId, deudorId, acreedorId, monto, fecha, nota });
  return pago.toJSON();
}

async function listarPagos(grupoId) {
  const pagos = await PagoEntreMiembros.findAll({
    where: { grupoId },
    order: [['fecha', 'DESC'], ['createdAt', 'DESC']],
  });
  return pagos.map((p) => p.toJSON());
}

module.exports = { saldosDelGrupo, registrarPago, listarPagos };
