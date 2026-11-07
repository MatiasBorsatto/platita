import { describe, it, expect } from 'vitest'
import { agruparPermisos, etiquetaDePermiso } from '../src/utils/controlParental.js'

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
