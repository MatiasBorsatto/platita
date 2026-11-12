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
