const Usuario = require('./usuario');
const Categoria = require('./categoria');
const Movimiento = require('./movimiento');
const Presupuesto = require('./presupuesto');
const Notificacion = require('./notificacion');
const Tarjeta = require('./tarjeta');
const Compra = require('./compra');
const Meta = require('./meta');
const AporteMeta = require('./aporte-meta');
const Grupo = require('./grupo');
const MiembroGrupo = require('./miembro-grupo');
const Invitacion = require('./invitacion');
const ParticipacionGasto = require('./participacion-gasto');
const PagoEntreMiembros = require('./pago-entre-miembros');

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

Usuario.hasMany(Tarjeta, { foreignKey: 'usuarioId' });
Tarjeta.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Usuario.hasMany(Compra, { foreignKey: 'usuarioId' });
Compra.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Tarjeta.hasMany(Compra, { foreignKey: 'tarjetaId' });
Compra.belongsTo(Tarjeta, { foreignKey: 'tarjetaId' });
Tarjeta.hasMany(Movimiento, { foreignKey: 'tarjetaId' });
Movimiento.belongsTo(Tarjeta, { foreignKey: 'tarjetaId' });
Compra.hasMany(Movimiento, { foreignKey: 'compraId' });
Movimiento.belongsTo(Compra, { foreignKey: 'compraId' });

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

module.exports = {
  Usuario,
  Categoria,
  Movimiento,
  Presupuesto,
  Notificacion,
  Tarjeta,
  Compra,
  Meta,
  AporteMeta,
  Grupo,
  MiembroGrupo,
  Invitacion,
  ParticipacionGasto,
  PagoEntreMiembros,
};
