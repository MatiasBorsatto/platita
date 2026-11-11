import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { defineComponent, h } from 'vue'
import TourGuiado from '../src/components/TourGuiado.vue'
import BotonAyuda from '../src/components/BotonAyuda.vue'
import { tour, iniciarTour, terminarTour, tourVisto } from '../src/services/tour.js'
import { PASOS } from '../src/tour/pasos.js'
import { useSesion } from '../src/stores/sesion.js'

const Vacia = defineComponent({ render: () => h('div') })

function armar() {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSesion().usuario = { id: 'u-tour', nombre: 'Ana' }
  const rutas = [...new Set(PASOS.map((p) => p.ruta).filter(Boolean)), '/']
  const router = createRouter({ history: createMemoryHistory(), routes: rutas.map((path) => ({ path, component: Vacia })) })
  return { pinia, router }
}

const montados = []
function montar(componente, opciones) {
  const w = mount(componente, opciones)
  montados.push(w)
  return w
}

const tarjeta = () => document.body.querySelector('[role="dialog"]')

describe('tour guiado', () => {
  beforeEach(() => {
    localStorage.clear()
    terminarTour()
  })
  afterEach(() => {
    terminarTour()
    while (montados.length) montados.pop().unmount()
  })

  test('cada paso tiene título y texto, y los ids no se repiten', () => {
    expect(PASOS.length).toBeGreaterThan(10)
    expect(new Set(PASOS.map((p) => p.id)).size).toBe(PASOS.length)
    for (const p of PASOS) {
      expect(p.titulo).toBeTruthy()
      expect(p.texto).toBeTruthy()
      expect(p.icono.length).toBeGreaterThan(0)
    }
  })

  test('el botón flotante abre el tour desde el primer paso', async () => {
    const { pinia } = armar()
    const w = montar(BotonAyuda, { global: { plugins: [pinia] } })
    tour.indice = 5
    await w.find('button').trigger('click')
    expect(tour.activo).toBe(true)
    expect(tour.indice).toBe(0)
  })

  test('avanza, retrocede y al saltar queda marcado como visto', async () => {
    const { pinia, router } = armar()
    montar(TourGuiado, { global: { plugins: [pinia, router] }, attachTo: document.body })
    iniciarTour(0)
    await flushPromises()
    expect(tarjeta().textContent).toContain(PASOS[0].titulo)

    document.body.querySelector('[data-tour-siguiente]').click()
    await flushPromises()
    expect(tour.indice).toBe(1)
    expect(tarjeta().textContent).toContain(PASOS[1].titulo)

    document.body.querySelector('[data-tour-anterior]').click()
    await flushPromises()
    expect(tour.indice).toBe(0)

    expect(tourVisto('u-tour')).toBe(false)
    document.body.querySelector('[data-tour-saltar]').click()
    await flushPromises()
    expect(tour.activo).toBe(false)
    expect(tourVisto('u-tour')).toBe(true)
  })

  test('Escape cierra el tour', async () => {
    const { pinia, router } = armar()
    montar(TourGuiado, { global: { plugins: [pinia, router] }, attachTo: document.body })
    iniciarTour(0)
    await flushPromises()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(tour.activo).toBe(false)
  })

  test('un paso con ruta lleva a ese módulo', async () => {
    const { pinia, router } = armar()
    montar(TourGuiado, { global: { plugins: [pinia, router] }, attachTo: document.body })
    await router.push('/')
    await router.isReady()
    const indice = PASOS.findIndex((p) => p.ruta === '/presupuestos')
    iniciarTour(indice)
    await flushPromises()
    await new Promise((r) => setTimeout(r, 50))
    expect(router.currentRoute.value.path).toBe('/presupuestos')
  })
})
