const { Movimiento, MiembroGrupo, ParticipacionGasto, PagoEntreMiembros, AporteGasto, Usuario } = require('../../db/models');
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
// Devuelve una fila por integrante y por moneda: los saldos nunca mezclan monedas.
async function saldosDelGrupo(usuarioId, grupoId) {
  const movs = await Movimiento.findAll({
    where: { grupoId, alcance: 'compartido', tipo: 'gasto' },
    attributes: ['id', 'monto', 'moneda'],
  });
  const monedaDe = new Map(movs.map((m) => [m.id, m.moneda]));
  const participaciones = movs.length
    ? await ParticipacionGasto.findAll({ where: { movimientoId: movs.map((m) => m.id) } })
    : [];
  const aportes = movs.length
    ? await AporteGasto.findAll({ where: { movimientoId: movs.map((m) => m.id) } })
    : [];
  const pagos = await PagoEntreMiembros.findAll({ where: { grupoId } });
  const miembros = await MiembroGrupo.findAll({
    where: { grupoId },
    order: [['createdAt', 'ASC'], ['id', 'ASC']],
  });

  const monedas = new Set([...movs.map((m) => m.moneda), ...pagos.map((p) => p.moneda)]);
  if (monedas.size === 0) monedas.add('ARS');
  const ids = [...new Set(miembros.map((m) => m.usuarioId))];
  const usuarios = await Usuario.findAll({ where: { id: ids }, attributes: ['id', 'nombre'] });
  const nombres = Object.fromEntries(usuarios.map((u) => [u.id, u.nombre]));

  const filas = [];
  for (const moneda of [...monedas].sort()) {
    const saldos = calcularSaldos({
      aportadoPorUsuario: agrupar(aportes.filter((a) => monedaDe.get(a.movimientoId) === moneda), (a) => a.usuarioId),
      participacionPorUsuario: agrupar(participaciones.filter((p) => monedaDe.get(p.movimientoId) === moneda), (p) => p.usuarioId),
      pagosRealizados: agrupar(pagos.filter((p) => p.moneda === moneda), (p) => p.deudorId),
      pagosRecibidos: agrupar(pagos.filter((p) => p.moneda === moneda), (p) => p.acreedorId),
    });
    const idsMoneda = [...new Set([...ids, ...saldos.keys()])];
    for (const id of idsMoneda) {
      filas.push({ usuarioId: id, nombre: nombres[id] ?? null, moneda, saldo: saldos.get(id) ?? '0.00' });
    }
  }
  return filas;
}

async function registrarPago(usuarioId, grupoId, { deudorId, acreedorId, monto, moneda = 'ARS', fecha, nota = null }) {
  if (deudorId === acreedorId) throw new ErrorValidacion('El deudor y el acreedor deben ser distintos');
  for (const id of [deudorId, acreedorId]) {
    if (!(await MiembroGrupo.findOne({ where: { grupoId, usuarioId: id } }))) {
      throw new ErrorValidacion('El deudor y el acreedor deben ser miembros del grupo');
    }
  }
  const pago = await PagoEntreMiembros.create({ grupoId, deudorId, acreedorId, monto, moneda, fecha, nota });
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
