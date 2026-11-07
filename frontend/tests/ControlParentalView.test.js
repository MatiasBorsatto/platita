import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../src/services/controlParental.js', () => ({
  listarMenores: vi.fn(),
  vincularMenor: vi.fn(),
  cambiarPermisos: vi.fn(),
  desvincularMenor: vi.fn(),
  actividadDelMenor: vi.fn()
}))
vi.mock('../src/services/grupos.js', () => ({ listarGrupos: vi.fn() }))

import * as api from '../src/services/controlParental.js'
import { listarGrupos } from '../src/services/grupos.js'
import ControlParentalView from '../src/views/ControlParentalView.vue'

const permisos = [
  { permiso: 'gastos_fijos.crear', permitido: false, bloqueadoPorPolitica: false },
  { permiso: 'gastos.ver_simples', permitido: true, bloqueadoPorPolitica: false },
  { permiso: 'tarjetas.registrar', permitido: false, bloqueadoPorPolitica: true }
]
const menor = {
  vinculoId: 'v1', grupoId: 'g1',
  menor: { id: 'm1', nombre: 'Tomi', edad: 12, clasificacion: 'menor' },
  permisos
}

describe('ControlParentalView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listarMenores.mockResolvedValue([menor])
    listarGrupos.mockResolvedValue([{ id: 'g1', nombre: 'Familia' }])
  })

  it('un interruptor envía solo ese permiso al backend, con el valor elegido', async () => {
    api.cambiarPermisos.mockResolvedValue({ ...menor, permisos: permisos.map((p) => (p.permiso === 'gastos_fijos.crear' ? { ...p, permitido: true } : p)) })
    const w = mount(ControlParentalView)
    await flushPromises()
    const interruptor = w.findAll('input[role="switch"]').find((i) => i.element.closest('label').textContent.includes('Registrar gastos fijos'))
    await interruptor.setValue(true)
    await flushPromises()
    expect(api.cambiarPermisos).toHaveBeenCalledWith('m1', 'g1', { 'gastos_fijos.crear': true })
  })

  it('los permisos de tarjetas aparecen deshabilitados y no se pueden activar', async () => {
    const w = mount(ControlParentalView)
    await flushPromises()
    const tarjeta = w.findAll('input[role="switch"]').find((i) => i.element.closest('label').textContent.includes('Registrar tarjetas'))
    expect(tarjeta.element.disabled).toBe(true)
    expect(api.cambiarPermisos).not.toHaveBeenCalled()
  })

  it('si el backend rechaza el cambio, se muestra el error', async () => {
    api.cambiarPermisos.mockRejectedValue({ mensaje: 'Solo un adulto puede administrar el control parental' })
    const w = mount(ControlParentalView)
    await flushPromises()
    const interruptor = w.findAll('input[role="switch"]').find((i) => i.element.closest('label').textContent.includes('Ver gastos simples'))
    await interruptor.setValue(false)
    await flushPromises()
    expect(w.text()).toContain('Solo un adulto puede administrar el control parental')
  })
})
