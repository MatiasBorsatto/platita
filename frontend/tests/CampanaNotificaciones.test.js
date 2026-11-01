import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'

vi.mock('../src/services/notificaciones.js', () => ({
  listarNotificaciones: vi.fn().mockResolvedValue([
    { id: '1', mensaje: 'Llegaste al 80% del presupuesto de Comida', leida: false },
    { id: '2', mensaje: 'Superaste el presupuesto de Ocio', leida: false },
    { id: '3', mensaje: 'Vieja', leida: true }
  ]),
  marcarLeida: vi.fn().mockResolvedValue({ id: '1', leida: true })
}))

import CampanaNotificaciones from '../src/components/CampanaNotificaciones.vue'
import { marcarLeida } from '../src/services/notificaciones.js'

const opciones = { global: { stubs: { RouterLink: RouterLinkStub } } }

describe('CampanaNotificaciones', () => {
  it('muestra el contador de no leídas', async () => {
    const wrapper = mount(CampanaNotificaciones, opciones)
    await flushPromises()
    expect(wrapper.find('[data-testid="contador"]').text()).toBe('2')
  })

  it('el panel enlaza a Mi perfil y se cierra al elegirlo', async () => {
    const wrapper = mount(CampanaNotificaciones, opciones)
    await flushPromises()
    await wrapper.find('button.campana').trigger('click')
    const enlace = wrapper.findComponent(RouterLinkStub)
    expect(enlace.props('to')).toBe('/perfil')
    expect(enlace.text()).toBe('Mi perfil')
    await enlace.trigger('click')
    expect(wrapper.find('[role="region"]').exists()).toBe(false)
  })

  it('al marcar una como leída baja el contador', async () => {
    const wrapper = mount(CampanaNotificaciones, opciones)
    await flushPromises()
    await wrapper.find('button.campana').trigger('click')
    expect(wrapper.text()).toContain('Superaste el presupuesto de Ocio')
    await wrapper.find('[data-testid="marcar-1"]').trigger('click')
    await flushPromises()
    expect(marcarLeida).toHaveBeenCalledWith('1')
    expect(wrapper.find('[data-testid="contador"]').text()).toBe('1')
  })

  it('el panel tiene nombre accesible y Escape lo cierra devolviendo el foco a la campana', async () => {
    const wrapper = mount(CampanaNotificaciones, { ...opciones, attachTo: document.body })
    await flushPromises()
    const boton = wrapper.find('button.campana')
    await boton.trigger('click')
    const panel = wrapper.find('[role="region"]')
    expect(panel.attributes('aria-label')).toBe('Notificaciones')
    expect(boton.attributes('aria-controls')).toBe(panel.attributes('id'))
    await panel.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="region"]').exists()).toBe(false)
    expect(document.activeElement).toBe(boton.element)
    wrapper.unmount()
  })
})
