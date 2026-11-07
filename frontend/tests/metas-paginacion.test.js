import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../src/services/metas.js', () => ({
  listarMetasPagina: vi.fn(),
  crearMeta: vi.fn(),
  eliminarMeta: vi.fn(),
  registrarAporte: vi.fn()
}))
import * as api from '../src/services/metas.js'
import MetasView from '../src/views/MetasView.vue'

const meta = (n) => ({
  id: `00000000-0000-0000-0000-00000000000${n}`, nombre: `Meta ${n}`, montoObjetivo: '100.00',
  acumulado: '0.00', porcentaje: 0, restante: '100.00', fechaLimite: null
})

describe('MetasView con paginación', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra "Cargar más" cuando faltan metas y trae la página siguiente', async () => {
    api.listarMetasPagina
      .mockResolvedValueOnce({ items: [meta(1)], total: 2, pagina: 1, limite: 20 })
      .mockResolvedValueOnce({ items: [meta(2)], total: 2, pagina: 2, limite: 20 })
    const w = mount(MetasView)
    await flushPromises()
    expect(w.text()).toContain('Meta 1')
    const boton = w.find('button.cargar-mas')
    expect(boton.exists()).toBe(true)
    await boton.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Meta 2')
    expect(w.find('button.cargar-mas').exists()).toBe(false)
  })

  it('sin más metas no muestra el botón', async () => {
    api.listarMetasPagina.mockResolvedValue({ items: [meta(1)], total: 1, pagina: 1, limite: 20 })
    const w = mount(MetasView)
    await flushPromises()
    expect(w.find('button.cargar-mas').exists()).toBe(false)
  })
})
