import { describe, it, expect, vi } from 'vitest'
import { esArchivoViejo, recargarUnaVez } from '../src/utils/versionNueva.js'

function almacenamientoFalso() {
  const datos = new Map()
  return { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, v) }
}

describe('pestaña abierta desde antes de un deploy', () => {
  it('reconoce el error de pantalla que ya no existe en cada navegador', () => {
    expect(esArchivoViejo(new TypeError('Failed to fetch dynamically imported module: https://x/assets/PerfilView-r59TGqvL.js'))).toBe(true)
    expect(esArchivoViejo(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(esArchivoViejo(new Error('error loading dynamically imported module'))).toBe(true)
    expect(esArchivoViejo(new Error('Request failed with status 500'))).toBe(false)
    expect(esArchivoViejo(undefined)).toBe(false)
  })

  it('recarga hacia la pantalla pedida una sola vez', () => {
    const almacenamiento = almacenamientoFalso()
    const ir = vi.fn()
    expect(recargarUnaVez('/perfil', { ahora: 1000, almacenamiento, ir })).toBe(true)
    expect(ir).toHaveBeenCalledWith('/perfil')

    // Si falla otra vez enseguida, no insiste: evita un bucle de recargas.
    expect(recargarUnaVez('/perfil', { ahora: 5000, almacenamiento, ir })).toBe(false)
    expect(ir).toHaveBeenCalledTimes(1)

    // Pasado un rato (otro deploy), vuelve a poder recargar.
    expect(recargarUnaVez('/perfil', { ahora: 60000, almacenamiento, ir })).toBe(true)
    expect(ir).toHaveBeenCalledTimes(2)
  })

  it('sin almacenamiento disponible igual recarga', () => {
    const roto = { getItem: () => { throw new Error('bloqueado') }, setItem: () => { throw new Error('bloqueado') } }
    const ir = vi.fn()
    expect(recargarUnaVez('/metas', { ahora: 1000, almacenamiento: roto, ir })).toBe(true)
    expect(ir).toHaveBeenCalledWith('/metas')
  })
})
