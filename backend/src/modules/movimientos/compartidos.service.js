const { sequelize } = require('../../db/sequelize');
const { Movimiento, Categoria, MiembroGrupo, ParticipacionGasto } = require('../../db/models');
const { dividirEnPartes, sumar, aCentavos } = require('../../utils/dinero');
const { ErrorValidacion, ErrorNoEncontrado, ErrorProhibido } = require('../../utils/errores');
const { verificarCategoria } = require('./movimientos.service');

function aItem(mov) {
  const j = mov.toJSON();
  return {
    id: j.id,
    fecha: j.fecha,
    descripcion: j.descripcion,
    monto: j.monto,
    categoriaId: j.categoriaId,
    pagadorId: j.pagadorId,
    usuarioId: j.usuarioId,
    participaciones: (j.participaciones || []).map((p) => ({
      usuarioId: p.usuarioId,
      monto: p.monto,
      categoriaId: p.categoriaId,
    })),
  };
}

async function esMiembro(grupoId, usuarioId) {
  return Boolean(await MiembroGrupo.findOne({ where: { grupoId, usuarioId } }));
}

// Devuelve [{ usuarioId, monto }] que suma exactamente `monto`.
async function calcularParticipaciones(grupoId, monto, participantes) {
  if (!participantes) {
    const miembros = await MiembroGrupo.findAll({
      where: { grupoId },
      order: [['createdAt', 'ASC'], ['id', 'ASC']],
    });
    const partes = dividirEnPartes(monto, miembros.length);
    return miembros.map((m, i) => ({ usuarioId: m.usuarioId, monto: partes[i], categoriaId: null }));
  }
  const ids = participantes.map((p) => p.usuarioId);
  if (new Set(ids).size !== ids.length) throw new ErrorValidacion('Hay participantes repetidos');
  for (const id of ids) {
    if (!(await esMiembro(grupoId, id))) {
      throw new ErrorValidacion('Todos los participantes deben ser miembros del grupo');
    }
  }
  if (aCentavos(sumar(participantes.map((p) => p.monto))) !== aCentavos(monto)) {
    throw new ErrorValidacion('La suma de las participaciones debe ser igual al monto');
  }
  return participantes;
}

// El llamador ya verificó que usuarioId es miembro del grupo (grupoAccesible).
async function crearGastoCompartido(
  usuarioId,
  { grupoId, pagadorId, monto, fecha, categoriaId = null, descripcion = null, participantes }
) {
  if (!(await esMiembro(grupoId, pagadorId))) throw new ErrorValidacion('El pagador debe ser miembro del grupo');
  await verificarCategoria(usuarioId, categoriaId);
  const partes = await calcularParticipaciones(grupoId, monto, participantes);
  // Sin categoría explícita, la participación hereda la del gasto si es base o del propio participante;
  // si no, queda en null y el participante la elige después.
  const catGasto = categoriaId ? await Categoria.findByPk(categoriaId) : null;
  const heredada = (uid) => (catGasto && (catGasto.usuarioId === null || catGasto.usuarioId === uid) ? categoriaId : null);
  // Cada participante puede imputar su parte a una categoría propia (o base); por defecto, la del gasto.
  for (const p of partes) await verificarCategoria(p.usuarioId, p.categoriaId);

  return sequelize.transaction(async (transaction) => {
    const mov = await Movimiento.create(
      { usuarioId, tipo: 'gasto', alcance: 'compartido', grupoId, pagadorId, monto, fecha, descripcion, categoriaId },
      { transaction }
    );
    const filas = await ParticipacionGasto.bulkCreate(
      partes.map((p) => ({ movimientoId: mov.id, usuarioId: p.usuarioId, monto: p.monto, categoriaId: p.categoriaId || heredada(p.usuarioId) })),
      { transaction }
    );
    return { ...mov.toJSON(), participaciones: filas.map((f) => f.toJSON()) };
  });
}

async function listarGastosCompartidos(grupoId, { page = 1, limit = 20 } = {}) {
  const { rows, count } = await Movimiento.findAndCountAll({
    where: { grupoId, alcance: 'compartido', tipo: 'gasto' },
    include: [{ model: ParticipacionGasto, as: 'participaciones' }],
    order: [['fecha', 'DESC'], ['createdAt', 'DESC'], ['id', 'ASC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true,
  });
  return { items: rows.map(aItem), total: count };
}

// Solo el creador puede tocar el gasto; si no es un gasto compartido de este grupo, 404.
async function obtenerGastoDelCreador(usuarioId, grupoId, movimientoId) {
  const mov = await Movimiento.findOne({
    where: { id: movimientoId, grupoId, alcance: 'compartido', tipo: 'gasto' },
  });
  if (!mov) throw new ErrorNoEncontrado('Gasto no encontrado');
  if (mov.usuarioId !== usuarioId) throw new ErrorProhibido('Solo quien creó el gasto puede modificarlo');
  return mov;
}

async function editarGastoCompartido(usuarioId, grupoId, movimientoId, datos) {
  const mov = await obtenerGastoDelCreador(usuarioId, grupoId, movimientoId);
  const nuevo = {
    pagadorId: datos.pagadorId ?? mov.pagadorId,
    monto: datos.monto ?? mov.monto,
    fecha: datos.fecha ?? mov.fecha,
    descripcion: datos.descripcion !== undefined ? datos.descripcion : mov.descripcion,
    categoriaId: datos.categoriaId !== undefined ? datos.categoriaId : mov.categoriaId,
  };
  if (!(await esMiembro(grupoId, nuevo.pagadorId))) throw new ErrorValidacion('El pagador debe ser miembro del grupo');
  await verificarCategoria(usuarioId, nuevo.categoriaId);
  const partes = await calcularParticipaciones(grupoId, nuevo.monto, datos.participantes);
  const catGasto = nuevo.categoriaId ? await Categoria.findByPk(nuevo.categoriaId) : null;
  const heredada = (uid) =>
    catGasto && (catGasto.usuarioId === null || catGasto.usuarioId === uid) ? nuevo.categoriaId : null;
  for (const p of partes) await verificarCategoria(p.usuarioId, p.categoriaId);

  await sequelize.transaction(async (transaction) => {
    await mov.update(nuevo, { transaction });
    await ParticipacionGasto.destroy({ where: { movimientoId: mov.id }, transaction });
    await ParticipacionGasto.bulkCreate(
      partes.map((p) => ({
        movimientoId: mov.id,
        usuarioId: p.usuarioId,
        monto: p.monto,
        categoriaId: p.categoriaId || heredada(p.usuarioId),
      })),
      { transaction }
    );
  });
  const actualizado = await Movimiento.findByPk(mov.id, {
    include: [{ model: ParticipacionGasto, as: 'participaciones' }],
  });
  return aItem(actualizado);
}

async function eliminarGastoCompartido(usuarioId, grupoId, movimientoId) {
  const mov = await obtenerGastoDelCreador(usuarioId, grupoId, movimientoId);
  await sequelize.transaction(async (transaction) => {
    await ParticipacionGasto.destroy({ where: { movimientoId: mov.id }, transaction });
    await mov.destroy({ transaction });
  });
}

module.exports = { crearGastoCompartido, listarGastosCompartidos, editarGastoCompartido, eliminarGastoCompartido };
