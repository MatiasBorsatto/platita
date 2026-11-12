import { describe, it, expect } from 'vitest'
import { errorDelFormulario, payloadDelFormulario, describirTarjeta } from '../src/utils/gastoFijo.js'

describe('descripción de la tarjeta de un gasto fijo', () => {
  it('muestra tipo, solo los últimos cuatro dígitos, banco y titular', () => {
    const g = { tipoPago: 'tarjeta_debito', ultimosCuatro: '1234', banco: 'Banco Demo', titular: 'Carlos Pérez' }
    expect(describirTarjeta(g)).toBe('Tarjeta de débito ••••1234 · Banco Demo · Carlos Pérez')
  })

  it('a un menor (sin datos bancarios) solo le dice que es con tarjeta', () => {
    expect(describirTarjeta({ tipoPago: 'tarjeta_credito' })).toBe('Tarjeta de crédito')
  })

  it('un gasto simple no muestra nada', () => {
    expect(describirTarjeta({ tipoPago: 'simple' })).toBeNull()
  })
})

const base = {
  nombre: 'Internet', diaVencimiento: '10', categoriaId: '', tipoPago: 'simple', moneda: 'ARS',
  ambito: 'propio', grupoId: '', ultimosCuatro: '', banco: '', titular: '', alias: ''
}
const tarjeta = { ...base, tipoPago: 'tarjeta_credito', ultimosCuatro: '4321', banco: 'Banco X', titular: 'Ana', alias: '' }

describe('formulario de gasto fijo', () => {
  it('un gasto simple no pide datos de tarjeta', () => {
    expect(errorDelFormulario(base)).toBeNull()
    expect(payloadDelFormulario(base)).not.toHaveProperty('ultimosCuatro')
  })

  it('una tarjeta exige exactamente cuatro dígitos, banco y titular', () => {
    expect(errorDelFormulario({ ...tarjeta, ultimosCuatro: '432' })).toMatch(/cuatro dígitos/)
    expect(errorDelFormulario({ ...tarjeta, ultimosCuatro: '43a1' })).toMatch(/cuatro dígitos/)
    expect(errorDelFormulario({ ...tarjeta, banco: ' ' })).toMatch(/banco/)
    expect(errorDelFormulario({ ...tarjeta, titular: '' })).toMatch(/titular/)
    expect(errorDelFormulario(tarjeta)).toBeNull()
  })

  it('un gasto de grupo exige elegir el grupo y lo envía', () => {
    expect(errorDelFormulario({ ...base, ambito: 'grupo' })).toMatch(/grupo/)
    expect(payloadDelFormulario({ ...base, ambito: 'grupo', grupoId: 'g1' }).grupoId).toBe('g1')
  })

  it('el día de vencimiento debe estar entre 1 y 31', () => {
    expect(errorDelFormulario({ ...base, diaVencimiento: '0' })).toMatch(/1 y 31/)
    expect(errorDelFormulario({ ...base, diaVencimiento: '32' })).toMatch(/1 y 31/)
  })

  it('el payload nunca incluye número completo ni CVV', () => {
    const payload = payloadDelFormulario({ ...tarjeta, numeroTarjeta: '4111111111111111', cvv: '123' })
    expect(Object.keys(payload).join(' ')).not.toMatch(/numero|cvv|pin/i)
  })
})
