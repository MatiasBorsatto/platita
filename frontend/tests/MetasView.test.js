import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../src/services/metas.js', () => ({
  listarMetas: vi.fn(),
  crearMeta: vi.fn(),
  eliminarMeta: vi.fn(),
  registrarAporte: vi.fn()
}))
import * as api from '../src/services/metas.js'
import MetasView from '../src/views/MetasView.vue'

const meta = {
  id: '22222222-2222-2222-2222-222222222222', nombre: 'Viaje', montoObjetivo: '1000.00',
  acumulado: '250.00', porcentaje: 25, restante: '750.00', fechaLimite: null
}

describe('MetasView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listarMetas.mockResolvedValue([meta])
  })

  it('muestra porcentaje y restante de la API', async () => {
    const w = mount(MetasView)
    await flushPromises()
    expect(w.text()).toContain('25 %')
    expect(w.text()).toContain('$ 750,00 restante')
  })

  it('envía un retiro como monto negativo', async () => {
    api.registrarAporte.mockResolvedValue({ aporte: {}, meta: { ...meta, acumulado: '150.00', porcentaje: 15, restante: '850.00' } })
    const w = mount(MetasView)
    await flushPromises()
    const form = w.find('form.aporte')
    await form.find('select').setValue('retiro')
    await form.find('input[type="text"]').setValue('100')
    await form.trigger('submit')
    await flushPromises()
    expect(api.registrarAporte).toHaveBeenCalledWith(meta.id, expect.objectContaining({ monto: '-100.00' }))
    expect(w.text()).toContain('15 %')
  })
})
