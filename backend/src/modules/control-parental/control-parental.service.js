const { sequelize } = require('../../db/sequelize');
const { VinculoTutor, PermisoMenor, RegistroAuditoria, Usuario, MiembroGrupo } = require('../../db/models');
const { ErrorProhibido, ErrorNoEncontrado, ErrorValidacion } = require('../../utils/errores');
const { hoyBA } = require('../../utils/fechas');
const { clasificacionDe } = require('../autorizacion/autorizacion.service');
const { clasificar, edadA } = require('../autorizacion/clasificacion');
const { TODOS, TARJETAS } = require('../autorizacion/permisos');

const hoy = () => hoyBA().slice(0, 10);

// Solo un adulto puede administrar a otros integrantes.
async function exigirTutorAdulto(tutorId) {
  if ((await clasificacionDe(tutorId)) !== 'adulto') {
    throw new ErrorProhibido('Solo un adulto puede administrar el control parental');
  }
}

async function exigirVinculo(tutorId, menorId, grupoId) {
  const vinculo = await VinculoTutor.findOne({ where: { tutorId, menorId, grupoId } });
  if (!vinculo) throw new ErrorNoEncontrado('Menor no encontrado');
  return vinculo;
}

// Lista los menores que este tutor administra, con todos los permisos y su estado actual.
async function listarMenores(tutorId) {
  await exigirTutorAdulto(tutorId);
  const vinculos = await VinculoTutor.findAll({ where: { tutorId } });
  const menores = await Usuario.findAll({
    where: { id: vinculos.map((v) => v.menorId) },
    attributes: ['id', 'nombre', 'email', 'fechaNacimiento'],
  });
  const permisos = await PermisoMenor.findAll({ where: { vinculoId: vinculos.map((v) => v.id) } });
  return vinculos.map((v) => {
    const menor = menores.find((m) => m.id === v.menorId);
    const concedidos = new Set(permisos.filter((p) => p.vinculoId === v.id && p.permitido).map((p) => p.permiso));
    return {
      vinculoId: v.id,
      grupoId: v.grupoId,
      menor: {
        id: menor.id,
        nombre: menor.nombre,
        // Misma cuenta exacta que la clasificación (B-04): así la edad mostrada y el permiso nunca discrepan.
        edad: menor.fechaNacimiento ? edadA(String(menor.fechaNacimiento), hoy()) : null,
        clasificacion: clasificar(menor.fechaNacimiento, hoy()),
      },
      // Todos los permisos de la lista, con su valor. Tarjetas siempre aparecen como no concedidos.
      permisos: TODOS.map((permiso) => ({
        permiso,
        permitido: concedidos.has(permiso) && !TARJETAS.includes(permiso),
        bloqueadoPorPolitica: TARJETAS.includes(permiso),
      })),
    };
  });
}

// Cambia permisos de un menor. Cada cambio se registra en la auditoría, en la misma transacción.
async function actualizarPermisos(tutorId, menorId, grupoId, cambios) {
  await exigirTutorAdulto(tutorId);
  const vinculo = await exigirVinculo(tutorId, menorId, grupoId);
  const entradas = Object.entries(cambios || {});
  if (entradas.length === 0) throw new ErrorValidacion('No hay permisos para cambiar');
  for (const [permiso, valor] of entradas) {
    if (!TODOS.includes(permiso)) throw new ErrorValidacion(`Permiso desconocido: ${permiso}`);
    if (TARJETAS.includes(permiso) && valor === true) {
      throw new ErrorValidacion('Los permisos de tarjetas no se pueden conceder a menores');
    }
    if (typeof valor !== 'boolean') throw new ErrorValidacion('Cada permiso debe ser verdadero o falso');
  }

  await sequelize.transaction(async (transaction) => {
    for (const [permiso, valor] of entradas) {
      const actual = await PermisoMenor.findOne({ where: { vinculoId: vinculo.id, permiso }, transaction });
      const anterior = actual ? actual.permitido : false;
      if (anterior === valor) continue;
      if (actual) await actual.update({ permitido: valor }, { transaction });
      else await PermisoMenor.create({ vinculoId: vinculo.id, permiso, permitido: valor }, { transaction });
      await RegistroAuditoria.create({
        usuarioId: tutorId,
        accion: valor ? 'permiso.concedido' : 'permiso.retirado',
        entidad: 'permiso_menor',
        entidadId: vinculo.id,
        detalle: { menorId, grupoId, permiso, anterior, nuevo: valor },
      }, { transaction });
    }
  });
  return listarMenores(tutorId).then((lista) => lista.find((m) => m.vinculoId === vinculo.id));
}

// El tutor agrega a un menor del mismo grupo por su email. El menor debe tener menos de 18 años.
async function vincularMenor(tutorId, { grupoId, email }) {
  await exigirTutorAdulto(tutorId);
  const tutorEnGrupo = await MiembroGrupo.findOne({ where: { grupoId, usuarioId: tutorId } });
  if (!tutorEnGrupo) throw new ErrorNoEncontrado('Grupo no encontrado');
  const menor = await Usuario.findOne({ where: { email: String(email || '').trim().toLowerCase() } });
  if (!menor) throw new ErrorNoEncontrado('No existe un usuario con ese email');
  if (menor.id === tutorId) throw new ErrorValidacion('Un usuario no puede ser su propio tutor');
  if (clasificar(menor.fechaNacimiento, hoy()) !== 'menor') {
    throw new ErrorValidacion('Solo se pueden vincular usuarios menores de 18 años');
  }
  const miembro = await MiembroGrupo.findOne({ where: { grupoId, usuarioId: menor.id } });
  if (!miembro) throw new ErrorValidacion('El menor tiene que ser integrante del grupo');

  return sequelize.transaction(async (transaction) => {
    const [vinculo, creado] = await VinculoTutor.findOrCreate({
      where: { tutorId, menorId: menor.id, grupoId },
      transaction,
    });
    if (creado) {
      await RegistroAuditoria.create({
        usuarioId: tutorId, accion: 'vinculo.creado', entidad: 'vinculo_tutor', entidadId: vinculo.id,
        detalle: { menorId: menor.id, grupoId },
      }, { transaction });
    }
    return { vinculoId: vinculo.id, creado };
  });
}

async function desvincularMenor(tutorId, menorId, grupoId) {
  await exigirTutorAdulto(tutorId);
  const vinculo = await exigirVinculo(tutorId, menorId, grupoId);
  await sequelize.transaction(async (transaction) => {
    await RegistroAuditoria.create({
      usuarioId: tutorId, accion: 'vinculo.eliminado', entidad: 'vinculo_tutor', entidadId: vinculo.id,
      detalle: { menorId, grupoId },
    }, { transaction });
    await vinculo.destroy({ transaction });
  });
  return { ok: true };
}

// Registro de cambios hechos por el tutor sobre sus menores.
async function actividad(tutorId, menorId) {
  await exigirTutorAdulto(tutorId);
  const filas = await RegistroAuditoria.findAll({
    where: { usuarioId: tutorId },
    order: [['creadoEn', 'DESC']],
    limit: 300,
  });
  return filas
    .filter((f) => f.detalle && f.detalle.menorId === menorId)
    .slice(0, 100)
    .map((f) => ({ accion: f.accion, entidad: f.entidad, detalle: f.detalle, creadoEn: f.creadoEn }));
}

module.exports = { listarMenores, actualizarPermisos, vincularMenor, desvincularMenor, actividad };
