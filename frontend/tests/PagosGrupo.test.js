import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PagosGrupo from '../src/components/PagosGrupo.vue'

const miembros = [{ usuarioId: 'u1', nombre: 'Ana' }, { usuarioId: 'u2', nombre: 'Beto' }]

describe('PagosGrupo', () => {
  it('una sugerencia de "cómo saldar" llena el formulario con quién paga, a quién y cuánto', async () => {
    const w = mount(PagosGrupo, { props: { miembros, mostrarFormulario: true, usuarioId: 'u1' } })
    await w.setProps({ sugerencia: { deudorId: 'u2', acreedorId: 'u1', monto: '1500.50', moneda: 'USD' } })

    expect(w.find('select[name="deudorId"]').element.value).toBe('u2')
    expect(w.find('select[name="acreedorId"]').element.value).toBe('u1')
    expect(w.find('input[name="monto"]').element.value).toBe('1.500,50')
    expect(w.find('select[name="moneda"]').element.value).toBe('USD')

    await w.find('form').trigger('submit')
    expect(w.emitted('registrar')[0][0]).toMatchObject({ deudorId: 'u2', acreedorId: 'u1', monto: '1500.50', moneda: 'USD' })
  })
})
