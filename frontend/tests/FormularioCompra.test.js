import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormularioCompra from '../src/components/FormularioCompra.vue'

const categorias = [{ id: '11111111-1111-1111-1111-111111111111', nombre: 'Comida' }]

describe('FormularioCompra', () => {
  it('muestra las dos modalidades con su texto explicativo', () => {
    const wrapper = mount(FormularioCompra, { props: { categorias } })
    expect(wrapper.text()).toContain('Contar cada cuota en su mes')
    expect(wrapper.text()).toContain('Registrar la compra completa')
  })

  it('el payload incluye la modalidad elegida', async () => {
    const wrapper = mount(FormularioCompra, { props: { categorias } })
    await wrapper.find('input[name="montoTotal"]').setValue('12000,5')
    await wrapper.find('input[name="cuotas"]').setValue('6')
    await wrapper.find('input[name="modalidad"][value="compra_completa"]').setValue()
    await wrapper.find('form').trigger('submit')
    const datos = wrapper.emitted('guardar')[0][0]
    expect(datos.modalidad).toBe('compra_completa')
    expect(datos.montoTotal).toBe('12000.50')
    expect(datos.cuotas).toBe(6)
  })

  it('por defecto usa por_cuota', async () => {
    const wrapper = mount(FormularioCompra, { props: { categorias } })
    await wrapper.find('input[name="montoTotal"]').setValue('900')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('guardar')[0][0].modalidad).toBe('por_cuota')
  })

  it('rechaza cuotas fuera de 1 a 60', async () => {
    const wrapper = mount(FormularioCompra, { props: { categorias } })
    await wrapper.find('input[name="montoTotal"]').setValue('900')
    await wrapper.find('input[name="cuotas"]').setValue('61')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('guardar')).toBeUndefined()
    expect(wrapper.find('[role="alert"]').text()).toContain('cuotas')
  })
})
