import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SaldosGrupo from '../src/components/SaldosGrupo.vue'

const saldos = [
  { usuarioId: 'u1', nombre: 'Ana', saldo: '1500.50' },
  { usuarioId: 'u2', nombre: 'Beto', saldo: '-1500.50' },
  { usuarioId: 'u3', nombre: 'Cami', saldo: '0.00' }
]

describe('SaldosGrupo', () => {
  it('saldo positivo muestra "te deben" con el monto como texto', () => {
    const w = mount(SaldosGrupo, { props: { saldos, usuarioId: 'u1' } })
    const fila = w.findAll('[data-saldo]')[0].text()
    expect(fila).toContain('te deben')
    expect(fila).toContain('$ 1.500,50')
  })

  it('saldo negativo muestra "debés" con el monto', () => {
    const w = mount(SaldosGrupo, { props: { saldos, usuarioId: 'u2' } })
    const fila = w.findAll('[data-saldo]')[1].text()
    expect(fila).toContain('debés')
    expect(fila).toContain('$ 1.500,50')
  })

  it('muestra quién le paga a quién y deja registrar ese pago', async () => {
    const w = mount(SaldosGrupo, { props: { saldos, usuarioId: 'u3' } })
    const sugerencia = w.find('[data-transferencia]')
    expect(sugerencia.text()).toContain('Beto le paga $ 1.500,50 a Ana')
    await sugerencia.find('button').trigger('click')
    expect(w.emitted('saldar')[0][0]).toEqual({ deudorId: 'u2', acreedorId: 'u1', monto: '1500.50', moneda: 'ARS' })
  })

  it('le habla en segunda persona a quien tiene que pagar o cobrar', () => {
    expect(mount(SaldosGrupo, { props: { saldos, usuarioId: 'u2' } }).find('[data-transferencia]').text()).toContain('Le pagás $ 1.500,50 a Ana')
    expect(mount(SaldosGrupo, { props: { saldos, usuarioId: 'u1' } }).find('[data-transferencia]').text()).toContain('Beto te paga $ 1.500,50')
  })

  it('avisa lo que se debe de gastos que nadie terminó de pagar', () => {
    const conFaltante = [...saldos, { usuarioId: 'u4', nombre: 'Dani', moneda: 'ARS', saldo: '-200.00' }]
    const w = mount(SaldosGrupo, { props: { saldos: conFaltante, usuarioId: 'u1' } })
    expect(w.find('[data-sin-cubrir]').text()).toContain('Dani debe $ 200,00 de gastos que todavía nadie terminó de pagar')
  })

  it('si todos están al día lo dice', () => {
    const w = mount(SaldosGrupo, { props: { saldos: [{ usuarioId: 'u1', nombre: 'Ana', moneda: 'ARS', saldo: '0.00' }], usuarioId: 'u1' } })
    expect(w.text()).toContain('Están todos al día')
  })

  it('el botón Registrar pago emite el evento', async () => {
    const w = mount(SaldosGrupo, { props: { saldos, usuarioId: 'u1' } })
    await w.find('button').trigger('click')
    expect(w.emitted('registrar-pago')).toHaveLength(1)
  })

  it('sin usuarioId usa redacción neutral', () => {
    const w = mount(SaldosGrupo, { props: { saldos } })
    const filas = w.findAll('[data-saldo]').map((f) => f.text())
    expect(filas[0]).toContain('le deben')
    expect(filas[1]).toContain('debe $')
    expect(filas.join(' ')).not.toMatch(/te deben|debés/)
  })
})
