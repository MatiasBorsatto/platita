import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CargandoIndicador from '../src/components/CargandoIndicador.vue'

describe('CargandoIndicador', () => {
  it('muestra el aro de marca con el texto indicado y se anuncia como estado', () => {
    const wrapper = mount(CargandoIndicador, { props: { texto: 'Aceptando la invitación' } })
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.find('.aro').exists()).toBe(true)
    expect(wrapper.text()).toContain('Aceptando la invitación')
  })

  it('en variante esqueleto muestra tres filas animadas y un texto para lectores de pantalla', () => {
    const wrapper = mount(CargandoIndicador, { props: { variante: 'esqueleto' } })
    expect(wrapper.findAll('.fila')).toHaveLength(3)
    expect(wrapper.find('.solo-lectores').text()).toBe('Cargando')
  })
})
