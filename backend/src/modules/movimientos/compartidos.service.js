const { sequelize } = require('../../db/sequelize');
const { Movimiento, Categoria, MiembroGrupo, ParticipacionGasto, AporteGasto } = require('../../db/models');
const { dividirEnPartes, sumar, aCentavos, deCentavos } = require('../../utils/dinero');
const { hoyBA } = require('../../utils/fechas');
const { ErrorValidacion, ErrorNoEncontrado, ErrorProhibido } = require('../../utils/errores');
const { verificarCategoria, verificarCategoriasDe } = require('./movimientos.service');

function itemAportes(aportes) {
  return (aportes || []).map((a) => ({
    id: a.id,
    usuarioId: a.usuarioId,
    monto: String(a.monto),
    fecha: a.fecha,
  }));
}

function aItem(mov) {
  const j = mov.toJSON();
  const aportes = itemAportes(j.aportes);
  const totalAportado = sumar(aportes.map((a) => a.monto));
  const falta = aCentavos(j.monto) - aCentavos(totalAportado);
  return {
    id: j.id,
    tipo: j.tipo,
    alcance: j.alcance,
    fecha: j.fecha,
    descripcion: j.descripcion,
    monto: String(j.monto),
    categoriaId: j.categoriaId,
    pagadorId: j.pagadorId,
    usuarioId: j.usuarioId,
    grupoId: j.grupoId,
    participaciones: (j.participaciones || []).map((p) => ({
      usuarioId: p.usuarioId,
      monto: String(p.monto),
      categoriaId: p.categoriaId,
    })),
    aportes,
    totalAportado,
    faltaCubrir: falta > 0n ? deCentavos(falta) : '0.00',
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

async function verificarAportantes(grupoId, aportes) {
  if (!aportes) return;
  for (const a of aportes) {
    if (!(await esMiembro(grupoId, a.usuarioId))) {
      throw new ErrorValidacion('Todos los que aportaron deben ser miembros del grupo');
    }
  }
}

// Si el cliente no manda aportes, se conserva el comportamiento histórico:
// con pagadorId explícito, ese pagador puso todo el monto. Sin pagadorId, el
// usuario actual precarga su propia parte (como hace el formulario nuevo).
function aportesPorDefecto(usuarioId, pagadorId, monto, partes) {
  if (pagadorId) return [{ usuarioId: pagadorId, monto }];
  const propia = partes.find((p) => p.usuarioId === usuarioId);
  return propia ? [{ usuarioId: usuarioId, monto: propia.monto }] : [];
}

async function conAportes(movimientoId) {
  return Movimiento.findByPk(movimientoId, {
    include: [
      { model: ParticipacionGasto, as: 'participaciones' },
      { model: AporteGasto, as: 'aportes' },
    ],
  });
}

// El llamador ya verificó que usuarioId es miembro del grupo (grupoAccesible).
async function crearGastoCompartido(
  usuarioId,
  { grupoId, pagadorId, monto, fecha, categoriaId = null, descripcion = null, participantes, aportes }
) {
  if (pagadorId && !(await esMiembro(grupoId, pagadorId))) {
    throw new ErrorValidacion('El pagador debe ser miembro del grupo');
  }
  await verificarCategoria(usuarioId, categoriaId);
  const partes = await calcularParticipaciones(grupoId, monto, participantes);
  // Sin categoría explícita, la participación hereda la del gasto si es base o del propio participante;
  // si no, queda en null y el participante la elige después.
  const catGasto = categoriaId ? await Categoria.findByPk(categoriaId) : null;
  const heredada = (uid) => (catGasto && (catGasto.usuarioId === null || catGasto.usuarioId === uid) ? categoriaId : null);
  await verificarCategoriasDe(partes);

  const listaAportes = aportes ?? aportesPorDefecto(usuarioId, pagadorId, monto, partes);
  await verificarAportantes(grupoId, listaAportes);
  const fechaAporte = fecha;

  const id = await sequelize.transaction(async (transaction) => {
    const mov = await Movimiento.create(
      {
        usuarioId,
        tipo: 'gasto',
        alcance: 'compartido',
        grupoId,
        pagadorId: pagadorId ?? usuarioId,
        monto,
        fecha,
        descripcion,
        categoriaId,
      },
      { transaction }
    );
    await ParticipacionGasto.bulkCreate(
      partes.map((p) => ({ movimientoId: mov.id, usuarioId: p.usuarioId, monto: p.monto, categoriaId: p.categoriaId || heredada(p.usuarioId) })),
      { transaction }
    );
    if (listaAportes.length) {
      await AporteGasto.bulkCreate(
        listaAportes.map((a) => ({
          movimientoId: mov.id,
          usuarioId: a.usuarioId,
          monto: a.monto,
          fecha: a.fecha || fechaAporte,
        })),
        { transaction }
      );
    }
    return mov.id;
  });
  return aItem(await conAportes(id));
}

async function listarGastosCompartidos(grupoId, { page = 1, limit = 20 } = {}) {
  const { rows, count } = await Movimiento.findAndCountAll({
    where: { grupoId, alcance: 'compartido', tipo: 'gasto' },
    include: [
      { model: ParticipacionGasto, as: 'participaciones' },
      { model: AporteGasto, as: 'aportes' },
    ],
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
  const aportesActuales = await AporteGasto.findAll({ where: { movimientoId: mov.id } });
  const nuevo = {
    pagadorId: datos.pagadorId ?? mov.pagadorId,
    monto: datos.monto ?? mov.monto,
    fecha: datos.fecha ?? mov.fecha,
    descripcion: datos.descripcion !== undefined ? datos.descripcion : mov.descripcion,
    categoriaId: datos.categoriaId !== undefined ? datos.categoriaId : mov.categoriaId,
  };
  if (nuevo.pagadorId && !(await esMiembro(grupoId, nuevo.pagadorId))) {
    throw new ErrorValidacion('El pagador debe ser miembro del grupo');
  }
  await verificarCategoria(usuarioId, nuevo.categoriaId);
  const partes = await calcularParticipaciones(grupoId, nuevo.monto, datos.participantes);
  await verificarAportantes(grupoId, datos.aportes);
  const catGasto = nuevo.categoriaId ? await Categoria.findByPk(nuevo.categoriaId) : null;
  const heredada = (uid) =>
    catGasto && (catGasto.usuarioId === null || catGasto.usuarioId === uid) ? nuevo.categoriaId : null;
  await verificarCategoriasDe(partes);

  // Un único aporte por el total era el "pagador histórico". Si se corrige el
  // total o el pagador, ese aporte acompaña el cambio. Los aportes parciales
  // reales no se tocan: son plata que efectivamente puso cada persona.
  const aporteUnicoTotal =
    datos.aportes === undefined &&
    aportesActuales.length === 1 &&
    aCentavos(aportesActuales[0].monto) === aCentavos(mov.monto);

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

    if (datos.aportes !== undefined) {
      await AporteGasto.destroy({ where: { movimientoId: mov.id }, transaction });
      if (datos.aportes.length) {
        await AporteGasto.bulkCreate(
          datos.aportes.map((a) => ({
            movimientoId: mov.id,
            usuarioId: a.usuarioId,
            monto: a.monto,
            fecha: a.fecha || nuevo.fecha,
          })),
          { transaction }
        );
      }
    } else if (aporteUnicoTotal) {
      await aportesActuales[0].update(
        { usuarioId: nuevo.pagadorId ?? usuarioId, monto: nuevo.monto },
        { transaction }
      );
    }
  });
  return aItem(await conAportes(mov.id));
}

async function eliminarGastoCompartido(usuarioId, grupoId, movimientoId) {
  const mov = await obtenerGastoDelCreador(usuarioId, grupoId, movimientoId);
  await sequelize.transaction(async (transaction) => {
    await ParticipacionGasto.destroy({ where: { movimientoId: mov.id }, transaction });
    await AporteGasto.destroy({ where: { movimientoId: mov.id }, transaction });
    await mov.destroy({ transaction });
  });
}

async function obtenerGastoDelGrupo(grupoId, movimientoId) {
  const mov = await Movimiento.findOne({
    where: { id: movimientoId, grupoId, alcance: 'compartido', tipo: 'gasto' },
  });
  if (!mov) throw new ErrorNoEncontrado('Gasto no encontrado');
  return mov;
}

// Cualquier miembro registra sus propios aportes; el creador puede registrar los de cualquiera.
async function registrarAporte(usuarioId, grupoId, movimientoId, { usuarioId: aportanteId, monto, fecha }) {
  const mov = await obtenerGastoDelGrupo(grupoId, movimientoId);
  const objetivo = aportanteId || usuarioId;
  if (objetivo !== usuarioId && mov.usuarioId !== usuarioId) {
    throw new ErrorProhibido('Solo quien creó el gasto puede registrar aportes de otra persona');
  }
  if (!(await esMiembro(grupoId, objetivo))) {
    throw new ErrorValidacion('Quien aporta debe ser miembro del grupo');
  }
  const aporte = await AporteGasto.create({
    movimientoId: mov.id,
    usuarioId: objetivo,
    monto,
    fecha: fecha || hoyBA(),
  });
  return { ...aporte.toJSON(), monto: String(aporte.monto) };
}

async function eliminarAporte(usuarioId, grupoId, movimientoId, aporteId) {
  const mov = await obtenerGastoDelGrupo(grupoId, movimientoId);
  const aporte = await AporteGasto.findOne({ where: { id: aporteId, movimientoId: mov.id } });
  if (!aporte) throw new ErrorNoEncontrado('Aporte no encontrado');
  if (aporte.usuarioId !== usuarioId && mov.usuarioId !== usuarioId) {
    throw new ErrorProhibido('Solo podés borrar tus propios aportes');
  }
  await aporte.destroy();
}

module.exports = {
  crearGastoCompartido,
  listarGastosCompartidos,
  editarGastoCompartido,
  eliminarGastoCompartido,
  registrarAporte,
  eliminarAporte,
};
