import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BarraMeta from '../src/components/BarraMeta.vue'
import { formatearMonto } from '../src/utils/formato.js'

const montar = (props) => mount(BarraMeta, { props })

describe('BarraMeta', () => {
  it('muestra porcentaje y restante', () => {
    const w = montar({ montoObjetivo: '20000', acumulado: '5000', porcentaje: 25, restante: '15000' })
    expect(w.text()).toContain('25 %')
    expect(w.text()).toContain('$ 15.000,00 restante')
    expect(w.find('.relleno').attributes('style')).toContain('width: 25%')
    expect(w.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('25')
  })

  it('muestra los valores de la API tal cual, sin recalcular', () => {
    const w = montar({ montoObjetivo: '30000.00', acumulado: '10000.00', porcentaje: 33.33, restante: '-500.00' })
    expect(w.text()).toContain('33,33 %')
    expect(w.text()).toContain('-$ 500,00 restante')
    expect(w.text()).not.toContain('$ 20.000,00 restante')
  })

  it('limita la barra a 100 % y marca meta cumplida cuando se excede', () => {
    const w = montar({ montoObjetivo: '1000.00', acumulado: '1500.00', porcentaje: 150, restante: '-500.00' })
    expect(w.text()).toContain('150 %')
    expect(w.text()).toContain('-$ 500,00 restante')
    expect(w.find('.relleno').attributes('style')).toContain('width: 100%')
    expect(w.text()).toContain('Meta cumplida')
  })

  it('maneja acumulado negativo (más retiros que aportes)', () => {
    const w = montar({ montoObjetivo: '1000.00', acumulado: '-200.00', porcentaje: -20, restante: '1200.00' })
    expect(w.text()).toContain('-20 %')
    expect(w.text()).toContain('$ 1.200,00 restante')
    expect(w.find('.relleno').attributes('style')).toContain('width: 0%')
    expect(w.text()).toContain('-$ 200,00')
  })
})

describe('formatearMonto con negativos', () => {
  it('formatea con signo', () => {
    expect(formatearMonto('-1500.5')).toBe('-$ 1.500,50')
    expect(formatearMonto('-200.00')).toBe('-$ 200,00')
  })
})
