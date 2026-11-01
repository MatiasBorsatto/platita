import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormularioMovimiento from '../src/components/FormularioMovimiento.vue'

const categorias = [{ id: '11111111-1111-1111-1111-111111111111', nombre: 'Comida' }]

describe('FormularioMovimiento', () => {
  it('no envía con monto vacío y muestra error', async () => {
    const wrapper = mount(FormularioMovimiento, { props: { categorias } })
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('guardar')).toBeUndefined()
    expect(wrapper.find('[role="alert"]').text()).toContain('monto')
  })

  it('envía el monto como string con 2 decimales', async () => {
    const wrapper = mount(FormularioMovimiento, { props: { categorias } })
    await wrapper.find('input[name="monto"]').setValue('1500,5')
    await wrapper.find('input[name="fecha"]').setValue('2026-10-27')
    await wrapper.find('form').trigger('submit')
    const datos = wrapper.emitted('guardar')[0][0]
    expect(datos.monto).toBe('1500.50')
    expect(datos.tipo).toBe('gasto')
    expect(datos.categoriaId).toBeNull()
  })

  it('envía metaId solo si se elige una meta', async () => {
    const metas = [{ id: '22222222-2222-2222-2222-222222222222', nombre: 'Viaje' }]
    const wrapper = mount(FormularioMovimiento, { props: { categorias, metas } })
    await wrapper.find('input[name="monto"]').setValue('100')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('guardar')[0][0]).not.toHaveProperty('metaId')
    await wrapper.find('select[name="metaId"]').setValue(metas[0].id)
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('guardar')[1][0].metaId).toBe(metas[0].id)
  })

  it('no muestra el selector de meta sin metas', () => {
    const wrapper = mount(FormularioMovimiento, { props: { categorias } })
    expect(wrapper.find('select[name="metaId"]').exists()).toBe(false)
  })
})
