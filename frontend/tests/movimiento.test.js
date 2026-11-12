import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reducido, entrarPagina, salirPagina, contar, preferenciaAnimaciones, elegirAnimaciones } from '../src/motion/movimiento.js'
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

  it('por defecto anima aunque el sistema pida reducir movimiento; "sistema" y "desactivadas" lo respetan', () => {
    const original = window.matchMedia
    window.matchMedia = () => ({ matches: true })
    try {
      localStorage.removeItem('platita.animaciones')
      expect(preferenciaAnimaciones()).toBe('activadas')
      expect(reducido()).toBe(false)
      expect(document.documentElement.classList.contains('movimiento-reducido')).toBe(false)

      elegirAnimaciones('sistema')
      expect(reducido()).toBe(true)
      expect(document.documentElement.classList.contains('movimiento-reducido')).toBe(true)

      elegirAnimaciones('desactivadas')
      window.matchMedia = () => ({ matches: false })
      expect(reducido()).toBe(true)

      elegirAnimaciones('cualquiera')
      expect(preferenciaAnimaciones()).toBe('desactivadas')
    } finally {
      window.matchMedia = original
      localStorage.removeItem('platita.animaciones')
      document.documentElement.classList.remove('movimiento-reducido')
    }
  })

  it('CifraAnimada muestra el monto formateado con su valor final', async () => {
    const wrapper = mount(CifraAnimada, { props: { valor: '1234.50' } })
    await flushPromises()
    expect(wrapper.text()).toContain('1.234,50')
  })
})
