const Usuario = require('./usuario');
const Categoria = require('./categoria');
const Movimiento = require('./movimiento');
const Presupuesto = require('./presupuesto');
const Notificacion = require('./notificacion');
const Meta = require('./meta');
const AporteMeta = require('./aporte-meta');
const Grupo = require('./grupo');
const MiembroGrupo = require('./miembro-grupo');
const Invitacion = require('./invitacion');
const ParticipacionGasto = require('./participacion-gasto');
const PagoEntreMiembros = require('./pago-entre-miembros');
const GastoFijo = require('./gasto-fijo');
const ConceptoGastoFijo = require('./concepto-gasto-fijo');
const CuotaGastoFijo = require('./cuota-gasto-fijo');
const AporteGasto = require('./aporte-gasto');
const VinculoTutor = require('./vinculo-tutor');
const PermisoMenor = require('./permiso-menor');
const RegistroAuditoria = require('./registro-auditoria');

Usuario.hasMany(Categoria, { foreignKey: 'usuarioId' });
Categoria.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Usuario.hasMany(Movimiento, { foreignKey: 'usuarioId' });
Movimiento.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Categoria.hasMany(Movimiento, { foreignKey: 'categoriaId' });
Movimiento.belongsTo(Categoria, { foreignKey: 'categoriaId' });
Usuario.hasMany(Presupuesto, { foreignKey: 'usuarioId' });
Presupuesto.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Categoria.hasMany(Presupuesto, { foreignKey: 'categoriaId' });
Presupuesto.belongsTo(Categoria, { foreignKey: 'categoriaId' });

Usuario.hasMany(Notificacion, { foreignKey: 'usuarioId' });
Notificacion.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Presupuesto.hasMany(Notificacion, { foreignKey: 'presupuestoId' });
Notificacion.belongsTo(Presupuesto, { foreignKey: 'presupuestoId' });
CuotaGastoFijo.hasMany(Notificacion, { foreignKey: 'cuotaGastoFijoId' });
Notificacion.belongsTo(CuotaGastoFijo, { foreignKey: 'cuotaGastoFijoId' });

Usuario.hasMany(GastoFijo, { foreignKey: 'usuarioId' });
GastoFijo.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Categoria.hasMany(GastoFijo, { foreignKey: 'categoriaId' });
GastoFijo.belongsTo(Categoria, { foreignKey: 'categoriaId' });
GastoFijo.hasMany(ConceptoGastoFijo, { foreignKey: 'gastoFijoId', as: 'conceptos' });
ConceptoGastoFijo.belongsTo(GastoFijo, { foreignKey: 'gastoFijoId' });
GastoFijo.hasMany(CuotaGastoFijo, { foreignKey: 'gastoFijoId', as: 'cuotas' });
CuotaGastoFijo.belongsTo(GastoFijo, { foreignKey: 'gastoFijoId' });
CuotaGastoFijo.belongsTo(ConceptoGastoFijo, { foreignKey: 'conceptoId', as: 'concepto' });
CuotaGastoFijo.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Usuario.hasMany(CuotaGastoFijo, { foreignKey: 'usuarioId' });

Usuario.hasMany(Meta, { foreignKey: 'usuarioId' });
Meta.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Meta.hasMany(AporteMeta, { foreignKey: 'metaId' });
AporteMeta.belongsTo(Meta, { foreignKey: 'metaId' });
Meta.hasMany(Movimiento, { foreignKey: 'metaId' });
Movimiento.belongsTo(Meta, { foreignKey: 'metaId' });
Movimiento.hasMany(AporteMeta, { foreignKey: 'movimientoId' });
AporteMeta.belongsTo(Movimiento, { foreignKey: 'movimientoId' });

Grupo.hasMany(MiembroGrupo, { foreignKey: 'grupoId' });
MiembroGrupo.belongsTo(Grupo, { foreignKey: 'grupoId' });
Usuario.hasMany(MiembroGrupo, { foreignKey: 'usuarioId' });
MiembroGrupo.belongsTo(Usuario, { foreignKey: 'usuarioId' });

Grupo.hasMany(Movimiento, { foreignKey: 'grupoId' });
Movimiento.belongsTo(Grupo, { foreignKey: 'grupoId' });
Movimiento.hasMany(ParticipacionGasto, { foreignKey: 'movimientoId', as: 'participaciones' });
ParticipacionGasto.belongsTo(Movimiento, { foreignKey: 'movimientoId' });
Movimiento.hasMany(AporteGasto, { foreignKey: 'movimientoId', as: 'aportes' });
AporteGasto.belongsTo(Movimiento, { foreignKey: 'movimientoId' });
AporteGasto.belongsTo(Usuario, { foreignKey: 'usuarioId' });

GastoFijo.hasMany(Movimiento, { foreignKey: 'gastoFijoId' });
Movimiento.belongsTo(GastoFijo, { foreignKey: 'gastoFijoId' });

module.exports = {
  VinculoTutor,
  PermisoMenor,
  RegistroAuditoria,
  Usuario,
  Categoria,
  Movimiento,
  Presupuesto,
  Notificacion,
  Meta,
  AporteMeta,
  Grupo,
  MiembroGrupo,
  Invitacion,
  ParticipacionGasto,
  PagoEntreMiembros,
  GastoFijo,
  ConceptoGastoFijo,
  CuotaGastoFijo,
  AporteGasto,
};
