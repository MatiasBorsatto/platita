import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../src/services/presupuestos.js', () => ({
  estadoPresupuestos: vi.fn(),
  guardarPresupuesto: vi.fn(),
  eliminarPresupuesto: vi.fn()
}))
vi.mock('../src/services/movimientos.js', () => ({ listarCategorias: vi.fn() }))

import * as api from '../src/services/presupuestos.js'
import { listarCategorias } from '../src/services/movimientos.js'
import PresupuestosView from '../src/views/PresupuestosView.vue'

describe('PresupuestosView con moneda', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.estadoPresupuestos.mockResolvedValue([])
    listarCategorias.mockResolvedValue([{ id: 'c1', nombre: 'Viajes' }])
    api.guardarPresupuesto.mockResolvedValue({})
  })

  it('el presupuesto se guarda en la moneda elegida', async () => {
    const w = mount(PresupuestosView)
    await flushPromises()
    await w.find('select[name="moneda"]').setValue('USD')
    await w.find('select').setValue('c1')
    await w.find('input[inputmode="decimal"]').setValue('100')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(api.guardarPresupuesto).toHaveBeenCalledWith(expect.objectContaining({ categoriaId: 'c1', moneda: 'USD' }))
  })

  it('por defecto el presupuesto es en pesos', async () => {
    const w = mount(PresupuestosView)
    await flushPromises()
    expect(w.find('select[name="moneda"]').element.value).toBe('ARS')
  })

  it('cada presupuesto muestra su moneda', async () => {
    api.estadoPresupuestos.mockResolvedValue([
      { id: 'p1', categoriaId: 'c1', moneda: 'USD', montoLimite: '100.00', consumido: '0.00', restante: '100.00', porcentaje: 0, alerta: null }
    ])
    const w = mount(PresupuestosView)
    await flushPromises()
    expect(w.find('.moneda').text()).toBe('USD')
  })
})
