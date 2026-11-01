import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CampoMonto from '../src/components/CampoMonto.vue'

function montar(valor = '') {
  return mount(CampoMonto, { props: { modelValue: valor, 'onUpdate:modelValue': (v) => wrapper.setProps({ modelValue: v }) } })
}
let wrapper

describe('CampoMonto', () => {
  it('agrupa miles mientras se escribe y emite el valor canónico', async () => {
    wrapper = montar()
    await wrapper.find('input').setValue('30000')
    expect(wrapper.find('input').element.value).toBe('30.000')
    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual(['30000'])
  })

  it('mantiene la coma mientras se escriben decimales', async () => {
    wrapper = montar()
    await wrapper.find('input').setValue('1500,5')
    expect(wrapper.find('input').element.value).toBe('1.500,5')
    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual(['1500.50'])
  })

  it('al salir completa los centavos', async () => {
    wrapper = montar()
    await wrapper.find('input').setValue('1500')
    await wrapper.trigger('blur')
    expect(wrapper.find('input').element.value).toBe('1.500,00')
    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual(['1500.00'])
  })

  it('un punto seguido de tres dígitos se toma como separador de miles', async () => {
    wrapper = montar()
    await wrapper.find('input').setValue('1.500')
    expect(wrapper.find('input').element.value).toBe('1.500')
  })

  it('muestra con formato un valor que llega desde fuera', async () => {
    wrapper = montar('1500.50')
    expect(wrapper.find('input').element.value).toBe('1.500,50')
  })

  it('no acepta letras y un campo vacío queda vacío al salir', async () => {
    wrapper = montar()
    await wrapper.find('input').setValue('ab')
    expect(wrapper.find('input').element.value).toBe('')
    await wrapper.trigger('blur')
    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([''])
  })
})
