import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TablaMovimientos from '../src/components/TablaMovimientos.vue'
import { formatearMonto } from '../src/utils/formato.js'

const movimientos = [
  { id: '1', tipo: 'gasto', monto: '1500.50', fecha: '2026-10-27', descripcion: 'Super', categoriaId: 'c1' }
]
const categorias = [{ id: 'c1', nombre: 'Comida' }]

describe('TablaMovimientos', () => {
  it('muestra montos con formato argentino', () => {
    const wrapper = mount(TablaMovimientos, { props: { movimientos, categorias } })
    expect(wrapper.text()).toContain('$ 1.500,50')
    expect(wrapper.text()).toContain('Comida')
  })

  it('formatea sin usar floats', () => {
    expect(formatearMonto('1234567.05')).toBe('$ 1.234.567,05')
    expect(formatearMonto('0.5')).toBe('$ 0,50')
  })
})

describe('TablaMovimientos: aportes y retiros hechos desde Metas', () => {
  const registros = [
    { id: 'a', tipo: 'aporte_meta', monto: '50000.00', moneda: 'ARS', fecha: '2026-11-12', descripcion: 'Aporte a la meta «Smart TV»', categoriaId: null, metaId: 'm1' },
    { id: 'r', tipo: 'retiro_meta', monto: '20.00', moneda: 'USD', fecha: '2026-11-12', descripcion: 'Retiro de la meta «Fondo»', categoriaId: null, metaId: 'm2' }
  ]

  it('se ven con su descripción y el monto sin signo, porque no cambian Mi plata', () => {
    const w = mount(TablaMovimientos, { props: { movimientos: registros, categorias } })
    const filas = w.findAll('tbody tr')
    expect(filas[0].text()).toContain('Aporte a la meta «Smart TV»')
    expect(filas[0].find('.num').text()).toBe('$ 50.000,00')
    expect(filas[1].find('.num').text()).toBe('USD 20,00')
    expect(filas[0].find('.etiqueta').text()).toBe('Meta')
  })

  it('no se editan ni se borran desde Movimientos', () => {
    const w = mount(TablaMovimientos, { props: { movimientos: registros, categorias } })
    const fila = w.find('tbody tr')
    expect(fila.findAll('button')).toHaveLength(0)
    expect(fila.text()).toContain('Gestionado desde Metas')
  })
})
