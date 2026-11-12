import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('vue-router', () => ({ RouterLink: { props: ['to'], template: '<a><slot /></a>' } }))
vi.mock('../src/services/movimientos.js', () => ({
  listarMovimientos: vi.fn(),
  crearMovimiento: vi.fn(),
  editarMovimiento: vi.fn(),
  eliminarMovimiento: vi.fn(),
  listarCategorias: vi.fn(),
  dineroActual: vi.fn()
}))
vi.mock('../src/services/metas.js', () => ({ listarMetas: vi.fn() }))
vi.mock('../src/services/grupos.js', () => ({ listarGrupos: vi.fn(), crearGastoCompartido: vi.fn(), obtenerGrupo: vi.fn() }))
vi.mock('../src/services/gastos-fijos.js', () => ({ listarRecordatorios: vi.fn(), pagarCuota: vi.fn() }))

import * as movimientos from '../src/services/movimientos.js'
import { listarMetas } from '../src/services/metas.js'
import { listarGrupos } from '../src/services/grupos.js'
import { listarRecordatorios } from '../src/services/gastos-fijos.js'
import MovimientosView from '../src/views/MovimientosView.vue'

const categorias = [{ id: 'c1', nombre: 'Otros' }]

async function cargarIngreso(w) {
  await w.find('select[name="tipo"]').setValue('ingreso')
  await w.find('input[name="monto"]').setValue('30000')
  await w.find('select[name="categoriaId"]').setValue('c1')
  await w.find('input[name="descripcion"]').setValue('Ingreso de plata por trabajo')
  await w.find('form.form-mov').trigger('submit')
  await flushPromises()
}

describe('MovimientosView: formulario de carga', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    movimientos.listarMovimientos.mockResolvedValue({ items: [], total: 0 })
    movimientos.listarCategorias.mockResolvedValue(categorias)
    movimientos.dineroActual.mockResolvedValue(null)
    movimientos.crearMovimiento.mockResolvedValue({ id: 'm1' })
    listarMetas.mockResolvedValue([])
    listarGrupos.mockResolvedValue([])
    listarRecordatorios.mockResolvedValue([])
  })

  it('después de guardar, el formulario queda vacío para cargar otro', async () => {
    const w = mount(MovimientosView)
    await flushPromises()

    await cargarIngreso(w)

    expect(movimientos.crearMovimiento).toHaveBeenCalledTimes(1)
    expect(w.find('input[name="monto"]').element.value).toBe('')
    expect(w.find('input[name="descripcion"]').element.value).toBe('')
    expect(w.find('select[name="categoriaId"]').element.value).toBe('')
    expect(w.find('select[name="tipo"]').element.value).toBe('gasto')
  })

  it('si no se pudo guardar, los datos quedan para reintentar', async () => {
    movimientos.crearMovimiento.mockRejectedValue({ mensaje: 'Sin conexión' })
    const w = mount(MovimientosView)
    await flushPromises()

    await cargarIngreso(w)

    expect(w.find('input[name="descripcion"]').element.value).toBe('Ingreso de plata por trabajo')
    expect(w.find('select[name="tipo"]').element.value).toBe('ingreso')
  })
})

describe('MovimientosView: Mi plata por moneda', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    movimientos.listarMovimientos.mockResolvedValue({ items: [], total: 0 })
    movimientos.listarCategorias.mockResolvedValue(categorias)
    listarMetas.mockResolvedValue([])
    listarGrupos.mockResolvedValue([])
    listarRecordatorios.mockResolvedValue([])
  })

  it('muestra el saldo en dólares con la misma jerarquía que el de pesos, uno al lado del otro', async () => {
    movimientos.dineroActual.mockResolvedValue({
      dineroActual: '1912200.00', ingresos: '9960000.00', gastos: '8047800.00', gastosPersonales: '7211800.00', gastosCompartidos: '836000.00', fechaCorte: '2026-11-12',
      porMoneda: [
        { moneda: 'ARS', dineroActual: '1912200.00', ingresos: '9960000.00', gastos: '8047800.00', gastosPersonales: '7211800.00', gastosCompartidos: '836000.00' },
        { moneda: 'USD', dineroActual: '1500.00', ingresos: '1500.00', gastos: '0.00', gastosPersonales: '0.00', gastosCompartidos: '0.00' }
      ]
    })
    const w = mount(MovimientosView)
    await flushPromises()

    const saldos = w.findAll('[data-saldo]')
    expect(saldos.map((s) => s.attributes('data-saldo'))).toEqual(['ARS', 'USD'])
    expect(saldos.map((s) => s.find('.monto').text())).toEqual(['$ 1.912.200,00', 'USD 1.500,00'])
    // Misma jerarquía: el mismo elemento y las mismas clases para las dos monedas.
    expect(saldos[0].find('.monto').classes()).toEqual(saldos[1].find('.monto').classes())
    expect(saldos[1].text()).toContain('Ingresos')
    expect(w.find('[data-otra-moneda]').exists()).toBe(false)
  })

  it('con una sola moneda muestra un solo saldo', async () => {
    movimientos.dineroActual.mockResolvedValue({
      dineroActual: '100.00', ingresos: '100.00', gastos: '0.00', gastosPersonales: '0.00', gastosCompartidos: '0.00', fechaCorte: '2026-11-12',
      porMoneda: [{ moneda: 'ARS', dineroActual: '100.00', ingresos: '100.00', gastos: '0.00', gastosPersonales: '0.00', gastosCompartidos: '0.00' }]
    })
    const w = mount(MovimientosView)
    await flushPromises()
    expect(w.findAll('[data-saldo]')).toHaveLength(1)
  })
})
