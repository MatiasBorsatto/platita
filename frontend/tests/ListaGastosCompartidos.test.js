import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ListaGastosCompartidos from '../src/components/ListaGastosCompartidos.vue'

const miembros = [
  { usuarioId: 'u1', nombre: 'Ana' },
  { usuarioId: 'u2', nombre: 'Beto' }
]
const gastos = [
  { id: 'g1', fecha: '2026-10-05', descripcion: 'Super', monto: '100.00', categoriaId: null, pagadorId: 'u1', usuarioId: 'u1', participaciones: [] },
  { id: 'g2', fecha: '2026-10-04', descripcion: 'Luz', monto: '50.50', categoriaId: null, pagadorId: 'u2', usuarioId: 'u2', participaciones: [] }
]

function montar(usuarioId = 'u1') {
  return mount(ListaGastosCompartidos, { props: { gastos, miembros, usuarioId } })
}

describe('ListaGastosCompartidos', () => {
  it('muestra descripción, fecha, monto y quién pagó', () => {
    const w = montar()
    const filas = w.findAll('[data-gasto]')
    expect(filas).toHaveLength(2)
    expect(filas[0].text()).toContain('Super')
    expect(filas[0].text()).toContain('$ 100,00')
    expect(filas[0].text()).toContain('Ana')
    expect(filas[1].text()).toContain('$ 50,50')
  })

  it('solo el creador ve Editar y Eliminar', () => {
    const w = montar('u1')
    const filas = w.findAll('[data-gasto]')
    expect(filas[0].findAll('button').map((b) => b.text())).toEqual(['Editar', 'Eliminar'])
    expect(filas[1].findAll('button')).toHaveLength(0)
  })

  it('un usuario que no creó ningún gasto no ve botones', () => {
    const w = montar('u3')
    expect(w.findAll('button')).toHaveLength(0)
  })

  it('emite editar y eliminar con el gasto', async () => {
    const w = montar('u1')
    const [editar, eliminar] = w.findAll('[data-gasto]')[0].findAll('button')
    expect(editar.attributes('aria-label')).toContain('Super')
    await editar.trigger('click')
    await eliminar.trigger('click')
    expect(w.emitted('editar')[0][0].id).toBe('g1')
    expect(w.emitted('eliminar')[0][0].id).toBe('g1')
  })

  it('sin gastos muestra un mensaje', () => {
    const w = mount(ListaGastosCompartidos, { props: { gastos: [], miembros, usuarioId: 'u1' } })
    expect(w.text()).toContain('Todavía no hay gastos compartidos')
  })
})
