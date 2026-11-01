import { describe, it, expect } from 'vitest'
import { hoyLocal } from '../src/utils/formato.js'

describe('hoyLocal', () => {
  it('devuelve la fecha del calendario local, no la UTC', () => {
    // 23:30 del 27/10 local: en UTC (si la zona es UTC-3) ya sería el 28.
    expect(hoyLocal(new Date(2026, 9, 27, 23, 30))).toBe('2026-10-27')
    expect(hoyLocal(new Date(2026, 0, 5, 0, 10))).toBe('2026-01-05')
  })
})
