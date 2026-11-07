// Etiquetas y agrupación de los permisos del control parental. Lo que decide es el backend.
export const CATEGORIAS = {
  gastos: 'Gastos',
  gastos_fijos: 'Gastos fijos',
  tarjetas: 'Tarjetas',
  presupuestos: 'Presupuestos',
  estadisticas: 'Estadísticas',
  movimientos: 'Movimientos',
  categorias: 'Categorías',
  grupo: 'Grupo familiar'
}

const ETIQUETAS = {
  'gastos.ver_simples': 'Ver gastos simples',
  'gastos.crear_simples': 'Crear gastos simples',
  'gastos.editar_simples': 'Editar gastos simples',
  'gastos.eliminar_simples': 'Eliminar gastos simples',
  'gastos.ver_grupo': 'Ver gastos del grupo',
  'gastos.crear_grupo': 'Crear gastos para el grupo',
  'gastos.consultar_propios': 'Consultar gastos propios',
  'gastos_fijos.ver': 'Ver gastos fijos',
  'gastos_fijos.crear': 'Registrar gastos fijos',
  'gastos_fijos.editar': 'Modificar gastos fijos',
  'gastos_fijos.eliminar': 'Eliminar gastos fijos',
  'tarjetas.ver': 'Ver tarjetas',
  'tarjetas.ver_datos': 'Consultar información bancaria',
  'tarjetas.registrar': 'Registrar tarjetas',
  'tarjetas.modificar': 'Modificar tarjetas',
  'tarjetas.eliminar': 'Eliminar tarjetas',
  'presupuestos.ver': 'Consultar presupuestos',
  'estadisticas.ver': 'Visualizar estadísticas',
  'movimientos.ver': 'Consultar movimientos',
  'categorias.administrar': 'Administrar categorías',
  'grupo.ver_info': 'Acceder a la información del grupo',
  'grupo.gestionar_integrantes': 'Gestionar integrantes'
}

export const etiquetaDePermiso = (permiso) => ETIQUETAS[permiso] ?? permiso

// Agrupa los permisos por categoría, manteniendo el orden de CATEGORIAS.
export function agruparPermisos(permisos) {
  const grupos = new Map(Object.keys(CATEGORIAS).map((k) => [k, []]))
  for (const p of permisos) {
    const categoria = p.permiso.split('.')[0]
    if (!grupos.has(categoria)) grupos.set(categoria, [])
    grupos.get(categoria).push(p)
  }
  return [...grupos]
    .filter(([, items]) => items.length > 0)
    .map(([clave, items]) => ({ clave, titulo: CATEGORIAS[clave] ?? clave, items }))
}
