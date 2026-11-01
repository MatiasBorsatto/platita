import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const construidos = []
const destruidos = []
vi.mock('chart.js', () => {
  class Chart {
    constructor(canvas, config) {
      this.canvas = canvas
      this.config = config
      construidos.push(this)
    }
    destroy() { destruidos.push(this) }
    static register() {}
  }
  const stub = class {}
  return {
    Chart, BarController: stub, BarElement: stub, LineController: stub, LineElement: stub,
    PointElement: stub, DoughnutController: stub, ArcElement: stub, CategoryScale: stub,
    LinearScale: stub, Tooltip: stub, Legend: stub
  }
})

import GraficoIngresosGastos from '../src/charts/GraficoIngresosGastos.vue'
import GraficoGastosPorCategoria from '../src/charts/GraficoGastosPorCategoria.vue'
import GraficoAhorroNeto from '../src/charts/GraficoAhorroNeto.vue'
import GraficoSaldosGrupo from '../src/charts/GraficoSaldosGrupo.vue'

beforeEach(() => {
  construidos.length = 0
  destruidos.length = 0
})

describe('GraficoIngresosGastos', () => {
  const datos = [
    { mes: '2026-08', ingresos: '1500.50', gastos: '300.00' },
    { mes: '2026-09', ingresos: '2000.00', gastos: '2500.75' }
  ]

  it('pasa dos datasets, Ingresos y Gastos, con los valores recibidos', () => {
    mount(GraficoIngresosGastos, { props: { datos } })
    expect(construidos).toHaveLength(1)
    const { type, data } = construidos[0].config
    expect(type).toBe('bar')
    expect(data.labels).toEqual(['2026-08', '2026-09'])
    expect(data.datasets.map((d) => d.label)).toEqual(['Ingresos', 'Gastos'])
    expect(data.datasets[0].data).toEqual([1500.5, 2000])
    expect(data.datasets[1].data).toEqual([300, 2500.75])
  })

  it('tiene texto alternativo y tabla con los mismos valores formateados', () => {
    const w = mount(GraficoIngresosGastos, { props: { datos } })
    expect(w.find('canvas').attributes('aria-label')).toContain('ingresos y gastos')
    const celdas = w.findAll('tbody tr')[1].text()
    expect(celdas).toContain('2026-09')
    expect(celdas).toContain('$ 2.000,00')
    expect(celdas).toContain('$ 2.500,75')
  })

  it('reconstruye el gráfico al cambiar los datos y lo destruye al desmontar', async () => {
    const w = mount(GraficoIngresosGastos, { props: { datos } })
    await w.setProps({ datos: [datos[0]] })
    expect(construidos).toHaveLength(2)
    expect(destruidos).toHaveLength(1)
    w.unmount()
    expect(destruidos).toHaveLength(2)
  })
})

describe('GraficoGastosPorCategoria', () => {
  it('grafica monto por categoría y lista los valores', () => {
    const datos = [
      { categoriaId: 'c1', nombre: 'Comida', monto: '1200.00' },
      { categoriaId: null, nombre: 'Sin categoría', monto: '5.50' }
    ]
    const w = mount(GraficoGastosPorCategoria, { props: { datos } })
    const { data } = construidos[0].config
    expect(data.labels).toEqual(['Comida', 'Sin categoría'])
    expect(data.datasets[0].data).toEqual([1200, 5.5])
    expect(w.text()).toContain('$ 1.200,00')
    expect(w.text()).toContain('$ 5,50')
  })
})

describe('GraficoAhorroNeto', () => {
  it('grafica el ahorro neto como viene, con signo', () => {
    const datos = [{ mes: '2026-08', ahorroNeto: '-100.25' }, { mes: '2026-09', ahorroNeto: '50.00' }]
    const w = mount(GraficoAhorroNeto, { props: { datos } })
    expect(construidos[0].config.data.datasets[0].data).toEqual([-100.25, 50])
    expect(w.findAll('tbody tr')[0].text()).toContain('-$ 100,25')
  })
})

describe('GraficoSaldosGrupo', () => {
  it('un dataset por miembro con su saldo por mes', () => {
    const datos = [
      { mes: '2026-08', saldos: [{ usuarioId: 'u1', nombre: 'Ana', saldo: '10.00' }, { usuarioId: 'u2', nombre: 'Beto', saldo: '-10.00' }] },
      { mes: '2026-09', saldos: [{ usuarioId: 'u1', nombre: 'Ana', saldo: '0.00' }, { usuarioId: 'u2', nombre: 'Beto', saldo: '0.00' }] }
    ]
    const w = mount(GraficoSaldosGrupo, { props: { datos } })
    const { datasets } = construidos[0].config.data
    expect(datasets.map((d) => d.label)).toEqual(['Ana', 'Beto'])
    expect(datasets[1].data).toEqual([-10, 0])
    expect(w.findAll('tbody tr')[0].text()).toContain('-$ 10,00')
  })
})
