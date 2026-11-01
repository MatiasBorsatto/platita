import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('../src/services/usuario.js', () => ({ obtenerPerfil: vi.fn(), actualizarPerfil: vi.fn() }))
import { obtenerPerfil, actualizarPerfil } from '../src/services/usuario.js'
import PerfilView from '../src/views/PerfilView.vue'

const perfil = { id: 1, nombre: 'Ana', email: 'ana@example.com', preferenciasEmail: false }

async function montar() {
  setActivePinia(createPinia())
  const w = mount(PerfilView)
  await flushPromises()
  return w
}

describe('PerfilView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    obtenerPerfil.mockResolvedValue({ ...perfil })
  })

  it('carga el perfil y lo muestra en los campos', async () => {
    const w = await montar()
    expect(obtenerPerfil).toHaveBeenCalled()
    expect(w.find('input[name="nombre"]').element.value).toBe('Ana')
    expect(w.find('input[name="email"]').element.value).toBe('ana@example.com')
    expect(w.find('input[type="checkbox"]').element.checked).toBe(false)
    expect(w.text()).toContain('Recibir avisos por email cuando un presupuesto supera el 80% o el 100%')
  })

  it('al marcar y desmarcar el checkbox envía preferenciasEmail true y false', async () => {
    actualizarPerfil.mockResolvedValueOnce({ ...perfil, preferenciasEmail: true })
    actualizarPerfil.mockResolvedValueOnce({ ...perfil, preferenciasEmail: false })
    const w = await montar()
    await w.find('input[type="checkbox"]').setValue(true)
    await flushPromises()
    expect(actualizarPerfil).toHaveBeenLastCalledWith({ preferenciasEmail: true })
    await w.find('input[type="checkbox"]').setValue(false)
    await flushPromises()
    expect(actualizarPerfil).toHaveBeenLastCalledWith({ preferenciasEmail: false })
  })

  it('el formulario de datos envía solo los campos modificados', async () => {
    actualizarPerfil.mockResolvedValue({ ...perfil, nombre: 'Ana María' })
    const w = await montar()
    await w.find('input[name="nombre"]').setValue('Ana María')
    await w.find('form[aria-label="Datos personales"]').trigger('submit')
    await flushPromises()
    expect(actualizarPerfil).toHaveBeenCalledWith({ nombre: 'Ana María' })
    expect(w.find('[role="status"]').exists()).toBe(true)
  })

  it('la contraseña exige confirmación igual y no llama a la API si difiere', async () => {
    const w = await montar()
    await w.find('input[name="passwordActual"]').setValue('vieja-clave-1')
    await w.find('input[name="passwordNueva"]').setValue('nueva-clave-1')
    await w.find('input[name="passwordConfirmacion"]').setValue('otra-clave-22')
    await w.find('form[aria-label="Cambiar contraseña"]').trigger('submit')
    await flushPromises()
    expect(actualizarPerfil).not.toHaveBeenCalled()
    expect(w.find('[role="alert"]').text()).toContain('no coinciden')
  })

  it('con confirmación igual envía passwordActual y passwordNueva', async () => {
    actualizarPerfil.mockResolvedValue({ ...perfil })
    const w = await montar()
    await w.find('input[name="passwordActual"]').setValue('vieja-clave-1')
    await w.find('input[name="passwordNueva"]').setValue('nueva-clave-1')
    await w.find('input[name="passwordConfirmacion"]').setValue('nueva-clave-1')
    await w.find('form[aria-label="Cambiar contraseña"]').trigger('submit')
    await flushPromises()
    expect(actualizarPerfil).toHaveBeenCalledWith({ passwordActual: 'vieja-clave-1', passwordNueva: 'nueva-clave-1' })
  })

  it('muestra el mensaje de error de la API', async () => {
    actualizarPerfil.mockRejectedValue(Object.assign(new Error('La contraseña actual es incorrecta'), { mensaje: 'La contraseña actual es incorrecta' }))
    const w = await montar()
    await w.find('input[name="passwordActual"]').setValue('mala')
    await w.find('input[name="passwordNueva"]').setValue('nueva-clave-1')
    await w.find('input[name="passwordConfirmacion"]').setValue('nueva-clave-1')
    await w.find('form[aria-label="Cambiar contraseña"]').trigger('submit')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('La contraseña actual es incorrecta')
  })

  it('si falla el cambio del checkbox lo revierte y muestra el error', async () => {
    actualizarPerfil.mockRejectedValue(Object.assign(new Error('Falla'), { mensaje: 'Falla' }))
    const w = await montar()
    await w.find('input[type="checkbox"]').setValue(true)
    await flushPromises()
    expect(w.find('input[type="checkbox"]').element.checked).toBe(false)
    expect(w.find('[role="alert"]').text()).toContain('Falla')
  })
})
