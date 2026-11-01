import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LayoutPrincipal from '../src/components/LayoutPrincipal.vue'

vi.mock('../src/components/CampanaNotificaciones.vue', () => ({ default: { template: '<span />' } }))

describe('LayoutPrincipal', () => {
  it('muestra los enlaces principales, incluido Perfil', () => {
    setActivePinia(createPinia())
    const w = mount(LayoutPrincipal, {
      global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' }, RouterView: true } }
    })
    const textos = w.findAll('a').map((a) => a.text())
    expect(textos).toEqual(['Movimientos', 'Presupuestos', 'Tarjetas', 'Metas', 'Grupos', 'Estadísticas', 'Perfil'])
    expect(w.text()).toContain('Salir')
  })
})
