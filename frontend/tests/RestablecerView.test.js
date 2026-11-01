import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

let query = {}
vi.mock('vue-router', () => ({ useRoute: () => ({ query }), useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../src/services/auth.js', () => ({ restablecerPassword: vi.fn() }))
import { restablecerPassword } from '../src/services/auth.js'
import RestablecerView from '../src/views/RestablecerView.vue'

const montar = () => mount(RestablecerView, { global: { stubs: { RouterLink: true } } })

describe('RestablecerView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sin token muestra un error y no permite enviar', () => {
    query = {}
    const w = montar()
    expect(w.find('[role="alert"]').text()).toContain('enlace')
    expect(w.find('form').exists()).toBe(false)
  })

  it('con token envía token y password al servicio y muestra el éxito', async () => {
    query = { token: 'abc123' }
    restablecerPassword.mockResolvedValue({})
    const w = montar()
    const campos = w.findAll('input[type="password"]')
    await campos[0].setValue('nueva-clave-1')
    await campos[1].setValue('nueva-clave-1')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(restablecerPassword).toHaveBeenCalledWith('abc123', 'nueva-clave-1')
    expect(w.text()).toContain('Contraseña actualizada')
  })

  it('si las contraseñas no coinciden no llama al servicio', async () => {
    query = { token: 'abc123' }
    const w = montar()
    const campos = w.findAll('input[type="password"]')
    await campos[0].setValue('nueva-clave-1')
    await campos[1].setValue('otra-clave-22')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(restablecerPassword).not.toHaveBeenCalled()
    expect(w.find('[role="alert"]').exists()).toBe(true)
  })
})
