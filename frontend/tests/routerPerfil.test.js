import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { crearRouter } from '../src/router/index.js'
import { useSesion } from '../src/stores/sesion.js'

describe('ruta /perfil', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('sin sesión redirige a /login', async () => {
    const sesion = useSesion()
    sesion.cargarSesion = async () => {}
    const router = crearRouter()
    await router.push('/perfil')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('con sesión se permite', async () => {
    const sesion = useSesion()
    sesion.cargarSesion = async () => {}
    sesion.usuario = { id: 1, email: 'a@b.com' }
    const router = crearRouter()
    await router.push('/perfil')
    expect(router.currentRoute.value.path).toBe('/perfil')
  })
})
