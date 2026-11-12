import { describe, it, expect } from 'vitest'
import { comoSaldar } from '../src/utils/saldar.js'

const fila = (usuarioId, saldo, moneda = 'ARS') => ({ usuarioId, nombre: usuarioId, moneda, saldo })

describe('comoSaldar: quién le paga a quién', () => {
  it('un deudor y un acreedor: una sola transferencia', () => {
    const r = comoSaldar([fila('Carlos', '-80000.00'), fila('Laura', '80000.00')])
    expect(r.transferencias).toEqual([{ deudorId: 'Carlos', acreedorId: 'Laura', monto: '80000.00', moneda: 'ARS' }])
    expect(r.sinCubrir).toEqual([])
  })

  it('varios deudores y acreedores con la menor cantidad de pagos, exacto al centavo', () => {
    const r = comoSaldar([fila('A', '-100.01'), fila('B', '-50.00'), fila('C', '120.00'), fila('D', '30.01'), fila('E', '0.00')])
    expect(r.transferencias).toEqual([
      { deudorId: 'A', acreedorId: 'C', monto: '100.01', moneda: 'ARS' },
      { deudorId: 'B', acreedorId: 'D', monto: '30.01', moneda: 'ARS' },
      { deudorId: 'B', acreedorId: 'C', monto: '19.99', moneda: 'ARS' }
    ])
  })

  it('nunca mezcla monedas', () => {
    const r = comoSaldar([fila('A', '-10.00', 'USD'), fila('B', '10.00', 'USD'), fila('A', '500.00'), fila('B', '-500.00')])
    expect(r.transferencias).toEqual([
      { deudorId: 'B', acreedorId: 'A', monto: '500.00', moneda: 'ARS' },
      { deudorId: 'A', acreedorId: 'B', monto: '10.00', moneda: 'USD' }
    ])
  })

  // Un gasto compartido que nadie terminó de pagar: hay deuda sin nadie a quien pagarle todavía.
  it('lo que se debe de un gasto sin cubrir queda aparte', () => {
    const r = comoSaldar([fila('Carlos', '-80000.00'), fila('Laura', '80000.00'), fila('Tomi', '-5000.00'), fila('Sofi', '-5000.00')])
    expect(r.transferencias).toEqual([{ deudorId: 'Carlos', acreedorId: 'Laura', monto: '80000.00', moneda: 'ARS' }])
    expect(r.sinCubrir).toEqual([
      { usuarioId: 'Tomi', monto: '5000.00', moneda: 'ARS' },
      { usuarioId: 'Sofi', monto: '5000.00', moneda: 'ARS' }
    ])
  })

  it('todos al día: nada que transferir', () => {
    expect(comoSaldar([fila('A', '0.00'), fila('B', '0.00')])).toEqual({ transferencias: [], sinCubrir: [] })
  })
})
