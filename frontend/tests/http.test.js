import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, configurarSesion } from '../src/services/http.js'

const resp = (status, cuerpo) => ({ ok: status < 400, status, json: async () => cuerpo })

describe('http: refresco de sesión', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('ante 401 refresca una vez y reintenta la petición original', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(resp(401, { error: 'No autenticado' }))
      .mockResolvedValueOnce(resp(200, {}))
      .mockResolvedValueOnce(resp(200, { dato: 1 }))
    expect(await http.get('/movimientos')).toEqual({ dato: 1 })
    const urls = globalThis.fetch.mock.calls.map((c) => c[0])
    expect(urls).toEqual(['/api/movimientos', '/api/auth/refresh', '/api/movimientos'])
  })

  it('si el refresco falla, propaga el 401', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(resp(401, { error: 'No autenticado' }))
      .mockResolvedValueOnce(resp(401, { error: 'Sesión vencida' }))
    await expect(http.get('/movimientos')).rejects.toMatchObject({ status: 401 })
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  it('con la sesión vencida avisa una sola vez para llevar al login (M-09)', async () => {
    const alExpirar = vi.fn()
    configurarSesion({ alExpirar })
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(resp(401, { error: 'No autenticado' }))
      .mockResolvedValueOnce(resp(401, { error: 'Sesión vencida' }))
    await expect(http.post('/movimientos', {})).rejects.toMatchObject({ status: 401 })
    expect(alExpirar).toHaveBeenCalledTimes(1)
    configurarSesion({})
  })

  it('el login fallido no se trata como sesión vencida', async () => {
    const alExpirar = vi.fn()
    configurarSesion({ alExpirar })
    globalThis.fetch = vi.fn().mockResolvedValue(resp(401, { error: 'Credenciales inválidas' }))
    await expect(http.post('/auth/login', {})).rejects.toMatchObject({ status: 401 })
    expect(alExpirar).not.toHaveBeenCalled()
    configurarSesion({})
  })

  it('sin fecha de nacimiento lleva a completarla', async () => {
    const alFaltarFecha = vi.fn()
    configurarSesion({ alFaltarFecha })
    globalThis.fetch = vi.fn().mockResolvedValue(resp(403, { error: 'Completá tu fecha', codigo: 'FECHA_NACIMIENTO_PENDIENTE' }))
    await expect(http.get('/movimientos')).rejects.toMatchObject({ status: 403, codigo: 'FECHA_NACIMIENTO_PENDIENTE' })
    expect(alFaltarFecha).toHaveBeenCalledTimes(1)
    configurarSesion({})
  })

  it('no intenta refrescar en login ni en refresh', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(resp(401, { error: 'Credenciales inválidas' }))
    await expect(http.post('/auth/login', {})).rejects.toMatchObject({ status: 401 })
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })
})
