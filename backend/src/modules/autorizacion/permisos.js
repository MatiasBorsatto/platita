// Lista única de permisos. Cualquier permiso que no esté acá se rechaza.
const PERMISOS = Object.freeze({
  GASTOS_VER_SIMPLES: 'gastos.ver_simples',
  GASTOS_CREAR_SIMPLES: 'gastos.crear_simples',
  GASTOS_EDITAR_SIMPLES: 'gastos.editar_simples',
  GASTOS_ELIMINAR_SIMPLES: 'gastos.eliminar_simples',
  GASTOS_VER_GRUPO: 'gastos.ver_grupo',
  GASTOS_CREAR_GRUPO: 'gastos.crear_grupo',
  GASTOS_CONSULTAR_PROPIOS: 'gastos.consultar_propios',
  GASTOS_FIJOS_VER: 'gastos_fijos.ver',
  GASTOS_FIJOS_CREAR: 'gastos_fijos.crear',
  GASTOS_FIJOS_EDITAR: 'gastos_fijos.editar',
  GASTOS_FIJOS_ELIMINAR: 'gastos_fijos.eliminar',
  TARJETAS_VER: 'tarjetas.ver',
  TARJETAS_VER_DATOS: 'tarjetas.ver_datos',
  TARJETAS_REGISTRAR: 'tarjetas.registrar',
  TARJETAS_MODIFICAR: 'tarjetas.modificar',
  TARJETAS_ELIMINAR: 'tarjetas.eliminar',
  PRESUPUESTOS_VER: 'presupuestos.ver',
  ESTADISTICAS_VER: 'estadisticas.ver',
  MOVIMIENTOS_VER: 'movimientos.ver',
  CATEGORIAS_ADMINISTRAR: 'categorias.administrar',
  GRUPO_VER_INFO: 'grupo.ver_info',
  GRUPO_GESTIONAR_INTEGRANTES: 'grupo.gestionar_integrantes',
});

const TODOS = Object.freeze(Object.values(PERMISOS));

// Permisos de tarjetas: un menor nunca los obtiene, aunque un tutor intente concederlos.
const TARJETAS = Object.freeze(TODOS.filter((p) => p.startsWith('tarjetas.')));

// Permisos familiares: exigen grupo o tutor. Sin fecha de nacimiento no se conceden. Los gastos
// personales (sin grupo) y los gastos fijos propios siguen disponibles hasta cargar la fecha.
const FAMILIARES = Object.freeze(
  TODOS.filter((p) => p === 'gastos.ver_grupo' || p === 'gastos.crear_grupo' || p.startsWith('tarjetas.') || p.startsWith('grupo.'))
);

module.exports = { PERMISOS, TODOS, TARJETAS, FAMILIARES };
