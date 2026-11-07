import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../src/services/estadisticas.js', () => ({
  resumenMensual: vi.fn(),
  serieHistorica: vi.fn()
}))
vi.mock('../src/charts/GraficoIngresosGastos.vue', () => ({ default: { render: () => null } }))
vi.mock('../src/charts/GraficoGastosPorCategoria.vue', () => ({ default: { render: () => null } }))
vi.mock('../src/charts/GraficoAhorroNeto.vue', () => ({ default: { render: () => null } }))

import * as api from '../src/services/estadisticas.js'
import CifraAnimada from '../src/components/CifraAnimada.vue'
import EstadisticasView from '../src/views/EstadisticasView.vue'

const resumen = {
  porMoneda: [
    { moneda: 'ARS', ingresos: '1000.00', gastos: '300.00', ahorroNeto: '700.00', aportesMetas: '0.00', gastosPorCategoria: [], presupuestos: [] },
    { moneda: 'USD', ingresos: '0.00', gastos: '120.00', ahorroNeto: '-120.00', aportesMetas: '0.00', gastosPorCategoria: [], presupuestos: [] }
  ]
}

const valorDe = (w, data) => w.find(`[${data}]`).findComponent(CifraAnimada).props()

describe('EstadisticasView por moneda', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.resumenMensual.mockResolvedValue(resumen)
    api.serieHistorica.mockResolvedValue([])
  })

  it('ofrece cada moneda con datos y muestra solo las cifras de la elegida', async () => {
    const w = mount(EstadisticasView)
    await flushPromises()

    const opciones = w.findAll('select[name="moneda"] option').map((o) => o.element.value)
    expect(opciones).toEqual(['ARS', 'USD'])

    expect(valorDe(w, 'data-ingresos')).toMatchObject({ valor: '1000.00', moneda: 'ARS' })

    await w.find('select[name="moneda"]').setValue('USD')
    await flushPromises()

    expect(valorDe(w, 'data-gastos')).toMatchObject({ valor: '120.00', moneda: 'USD' })
    expect(valorDe(w, 'data-ingresos')).toMatchObject({ valor: '0.00', moneda: 'USD' })
  })
})
