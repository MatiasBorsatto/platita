import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../src/services/deudas.js', () => ({ listarDeudas: vi.fn() }))
vi.mock('../src/services/gastos-fijos.js', () => ({ pagarCuota: vi.fn() }))
vi.mock('../src/services/dialogo.js', () => ({ confirmar: vi.fn() }))

import { listarDeudas } from '../src/services/deudas.js'
import { pagarCuota } from '../src/services/gastos-fijos.js'
import { confirmar } from '../src/services/dialogo.js'
import DeudasView from '../src/views/DeudasView.vue'

const deuda = (id, extra) => ({
  id, gastoId: `g-${id}`, nombre: `Gasto ${id}`, ambito: 'propio', mes: '2026-11', monto: '100.00', moneda: 'ARS',
  fechaVencimiento: '2026-11-20', vencida: false, puedePagar: true, ...extra
})
const datos = {
  deudas: [
    deuda('a', { nombre: 'Alquiler', monto: '450000.00', fechaVencimiento: '2026-11-10', vencida: true }),
    deuda('b', { nombre: 'Internet', monto: '28000.00' }),
    deuda('c', { nombre: 'Expensas del grupo', ambito: 'grupo', monto: '90000.00', puedePagar: false })
  ],
  totales: [{ moneda: 'ARS', pendiente: '568000.00', vencido: '450000.00' }]
}
const nombres = (w) => w.findAll('[data-deuda] .nombre').map((n) => n.text())

describe('DeudasView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listarDeudas.mockResolvedValue(datos)
    pagarCuota.mockResolvedValue({})
    confirmar.mockResolvedValue(true)
  })

  it('los totales separan lo vencido de lo que está por vencer', async () => {
    const w = mount(DeudasView)
    await flushPromises()
    const total = w.find('[data-total="ARS"]').text()
    expect(total).toContain('Total sin pagar')
    expect(total).toContain('ARS 568.000,00')
    expect(total).toContain('Vencido')
    expect(total).toContain('ARS 450.000,00')
    expect(total).toContain('Por vencer')
    expect(total).toContain('ARS 118.000,00')
  })

  it('deja elegir ver todas, solo las vencidas o solo las que están por vencer', async () => {
    const w = mount(DeudasView)
    await flushPromises()
    expect(w.find('[data-filtro="todas"]').text()).toContain('3')
    expect(w.find('[data-filtro="vencidas"]').text()).toContain('1')
    expect(w.find('[data-filtro="por-vencer"]').text()).toContain('2')
    expect(nombres(w)).toEqual(['Alquiler', 'Internet', 'Expensas del grupo'])

    await w.find('[data-filtro="vencidas"]').trigger('click')
    expect(nombres(w)).toEqual(['Alquiler'])
    expect(w.find('[data-filtro="vencidas"]').attributes('aria-pressed')).toBe('true')

    await w.find('[data-filtro="por-vencer"]').trigger('click')
    expect(nombres(w)).toEqual(['Internet', 'Expensas del grupo'])
  })

  it('Pagar registra el pago de la cuota y recarga la lista', async () => {
    const w = mount(DeudasView)
    await flushPromises()
    listarDeudas.mockResolvedValue({ deudas: datos.deudas.slice(1), totales: [{ moneda: 'ARS', pendiente: '118000.00', vencido: '0.00' }] })

    await w.find('[data-deuda="a"] [data-pagar]').trigger('click')
    await flushPromises()

    expect(confirmar).toHaveBeenCalledTimes(1)
    expect(pagarCuota).toHaveBeenCalledWith('g-a', 'a')
    expect(nombres(w)).toEqual(['Internet', 'Expensas del grupo'])
    expect(w.find('[role="status"]').text()).toContain('Alquiler')
  })

  it('si se cancela la confirmación no paga nada', async () => {
    confirmar.mockResolvedValue(false)
    const w = mount(DeudasView)
    await flushPromises()
    await w.find('[data-deuda="a"] [data-pagar]').trigger('click')
    await flushPromises()
    expect(pagarCuota).not.toHaveBeenCalled()
  })

  it('cada cuota muestra de qué concepto es', async () => {
    listarDeudas.mockResolvedValue({
      deudas: [deuda('n', { nombre: 'Mastercard', concepto: 'Notebook en 6 cuotas' }), deuda('s', { nombre: 'Mastercard', concepto: 'Streaming' })],
      totales: [{ moneda: 'ARS', pendiente: '200.00', vencido: '0.00' }]
    })
    const w = mount(DeudasView)
    await flushPromises()
    expect(w.find('[data-deuda="n"]').text()).toContain('Notebook en 6 cuotas')
    expect(w.find('[data-deuda="s"]').text()).toContain('Streaming')
  })

  it('una cuota de un gasto de grupo creado por otro no muestra Pagar', async () => {
    const w = mount(DeudasView)
    await flushPromises()
    const fila = w.find('[data-deuda="c"]')
    expect(fila.find('[data-pagar]').exists()).toBe(false)
    expect(fila.text()).toContain('La paga quien creó el gasto')
  })
})
