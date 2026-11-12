import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../src/services/gastos-fijos.js', () => ({
  listarGastosFijos: vi.fn(),
  crearGastoFijo: vi.fn(),
  eliminarGastoFijo: vi.fn()
}))
vi.mock('../src/services/categorias.js', () => ({ listarCategorias: vi.fn() }))
vi.mock('../src/services/grupos.js', () => ({ listarGrupos: vi.fn() }))

import { listarGastosFijos } from '../src/services/gastos-fijos.js'
import { listarCategorias } from '../src/services/categorias.js'
import { listarGrupos } from '../src/services/grupos.js'
import GastosFijosView from '../src/views/GastosFijosView.vue'

describe('GastosFijosView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listarGastosFijos.mockResolvedValue([])
    listarCategorias.mockResolvedValue([])
    listarGrupos.mockResolvedValue([])
  })

  // Regresión: el botón tenía "@click@click" y Vue lo escuchaba como el evento "click@click",
  // que nunca ocurre; no había forma de crear un gasto fijo desde la interfaz.
  it('el botón "Agregar gasto fijo" abre el formulario', async () => {
    const w = mount(GastosFijosView)
    await flushPromises()
    expect(w.find('form.form-fijo').exists()).toBe(false)

    await w.find('[data-agregar]').trigger('click')
    await flushPromises()

    expect(w.find('form.form-fijo').exists()).toBe(true)
  })

  // Regresión: la plantilla comparaba con una variable inexistente (ambito === grupo)
  // y el selector de grupo nunca aparecía.
  it('al elegir "Del grupo familiar" aparece el selector de grupo', async () => {
    listarGrupos.mockResolvedValue([{ id: 'g1', nombre: 'Familia' }])
    const w = mount(GastosFijosView)
    await flushPromises()
    await w.find('[data-agregar]').trigger('click')
    await flushPromises()
    expect(w.find('select[name="grupoId"]').exists()).toBe(false)

    await w.find('select[name="ambito"]').setValue('grupo')

    expect(w.find('select[name="grupoId"]').exists()).toBe(true)
  })

  it('muestra la tarjeta con solo los últimos cuatro dígitos', async () => {
    listarGastosFijos.mockResolvedValue([{
      id: 'f1', nombre: 'Seguro del auto', diaVencimiento: 20, categoriaId: null, moneda: 'ARS', conceptos: [],
      tipoPago: 'tarjeta_debito', ultimosCuatro: '1234', banco: 'Banco Demo', titular: 'Carlos Pérez',
      resumen: { totalMes: '0.00', pendientes: 0 }
    }])
    const w = mount(GastosFijosView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
    await flushPromises()

    expect(w.find('[data-tarjeta]').text()).toBe('Tarjeta de débito ••••1234 · Banco Demo · Carlos Pérez')
  })
})
