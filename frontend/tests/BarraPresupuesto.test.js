import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BarraPresupuesto from '../src/components/BarraPresupuesto.vue'

const montar = (props) => mount(BarraPresupuesto, { props })

describe('BarraPresupuesto', () => {
  it('muestra el color de advertencia con alerta 80 y el texto', () => {
    const w = montar({ montoLimite: '1000.00', consumido: '850.00', restante: '150.00', porcentaje: 85, alerta: '80' })
    expect(w.find('.barra').classes()).toContain('advertencia')
    expect(w.text()).toContain('85%')
    expect(w.text()).toContain('Cerca del límite')
  })

  it('muestra el color de error con alerta 100 y el texto', () => {
    const w = montar({ montoLimite: '1000.00', consumido: '1200.00', restante: '-200.00', porcentaje: 120, alerta: '100' })
    expect(w.find('.barra').classes()).toContain('error')
    expect(w.text()).toContain('120%')
    expect(w.text()).toContain('Superado')
    expect(w.find('.relleno').attributes('style')).toContain('width: 100%')
  })

  it('sin alerta no usa colores de aviso y formatea montos', () => {
    const w = montar({ montoLimite: '1500.50', consumido: '100.00', restante: '1400.50', porcentaje: 7, alerta: null })
    const clases = w.find('.barra').classes()
    expect(clases).not.toContain('advertencia')
    expect(clases).not.toContain('error')
    expect(w.text()).toContain('$ 100,00')
    expect(w.text()).toContain('$ 1.500,50')
  })

  it('muestra el porcentaje y el restante de la API sin recalcular', () => {
    const w = montar({ montoLimite: '1000.00', consumido: '802.00', restante: '198.00', porcentaje: 80.2, alerta: '80' })
    expect(w.text()).toContain('80.2%')
    expect(w.text()).toContain('Restante: $ 198,00')
  })
})
