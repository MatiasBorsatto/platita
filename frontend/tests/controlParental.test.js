import { describe, it, expect } from 'vitest'
import { agruparPermisos, etiquetaDePermiso, describirActividad } from '../src/utils/controlParental.js'

describe('actividad del control parental', () => {
  it('describe cada acción del backend sin mostrar el código interno', () => {
    expect(describirActividad({ accion: 'permiso.concedido', detalle: { permiso: 'estadisticas.ver' } })).toBe('Permiso concedido: Visualizar estadísticas')
    expect(describirActividad({ accion: 'permiso.retirado', detalle: { permiso: 'movimientos.ver' } })).toBe('Permiso retirado: Consultar movimientos')
    expect(describirActividad({ accion: 'vinculo.creado', detalle: {} })).toBe('Quedó vinculado al grupo')
    expect(describirActividad({ accion: 'vinculo.eliminado', detalle: { motivo: 'salida_del_grupo' } })).toBe('Se desvinculó al salir del grupo')
    expect(describirActividad({ accion: 'otra.cosa' })).toBe('Cambio registrado')
  })

  it('antepone la fecha cuando existe', () => {
    const t = describirActividad({ accion: 'vinculo.creado', creadoEn: '2026-11-12T15:30:00Z' })
    expect(t).toMatch(/^\d{2}\/\d{2}\/2026.* · Quedó vinculado al grupo$/)
  })
})

describe('agrupación de permisos del control parental', () => {
  const permisos = [
    { permiso: 'tarjetas.registrar', permitido: false, bloqueadoPorPolitica: true },
    { permiso: 'gastos.ver_simples', permitido: true, bloqueadoPorPolitica: false },
    { permiso: 'gastos.crear_simples', permitido: false, bloqueadoPorPolitica: false }
  ]

  it('agrupa por categoría y las ordena según la lista de categorías', () => {
    const grupos = agruparPermisos(permisos)
    expect(grupos.map((g) => g.clave)).toEqual(['gastos', 'tarjetas'])
    expect(grupos[0].items).toHaveLength(2)
  })

  it('usa etiquetas legibles y conserva el código si no hay etiqueta', () => {
    expect(etiquetaDePermiso('gastos.ver_simples')).toBe('Ver gastos simples')
    expect(etiquetaDePermiso('algo.nuevo')).toBe('algo.nuevo')
  })
})
