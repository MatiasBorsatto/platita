import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reducido, entrarPagina, salirPagina, contar } from '../src/motion/movimiento.js'
import CifraAnimada from '../src/components/CifraAnimada.vue'

// jsdom no implementa matchMedia: el módulo lo trata como preferencia de reducir movimiento.
describe('movimiento', () => {
  it('sin matchMedia se considera movimiento reducido', () => {
    expect(reducido()).toBe(true)
  })

  it('con movimiento reducido las transiciones terminan al instante', () => {
    const done = vi.fn()
    entrarPagina(document.createElement('section'), done)
    expect(done).toHaveBeenCalledTimes(1)
    salirPagina(document.createElement('section'), done)
    expect(done).toHaveBeenCalledTimes(2)
  })

  it('contar entrega el valor final directamente con movimiento reducido', () => {
    const onUpdate = vi.fn()
    expect(contar(1234.5, onUpdate)).toBeNull()
    expect(onUpdate).toHaveBeenCalledWith(1234.5)
  })

  it('CifraAnimada muestra el monto formateado con su valor final', async () => {
    const wrapper = mount(CifraAnimada, { props: { valor: '1234.50' } })
    await flushPromises()
    expect(wrapper.text()).toContain('1.234,50')
  })
})
