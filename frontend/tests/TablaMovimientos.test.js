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
