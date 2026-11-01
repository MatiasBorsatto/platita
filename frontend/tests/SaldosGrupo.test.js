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
