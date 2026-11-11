<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { animate, stagger } from 'motion'
import { PASOS } from '../tour/pasos.js'
import { tour, siguientePaso, pasoAnterior, terminarTour, irAPaso, marcarTourVisto } from '../services/tour.js'
import { useSesion } from '../stores/sesion.js'
import { reducido } from '../motion/movimiento.js'

const router = useRouter()
const route = useRoute()
const sesion = useSesion()

const foco = ref(null)
const tarjeta = ref(null)
const icono = ref(null)
const siguiente = ref(null)
const chispas = ref(null)
const conObjetivo = ref(false)
// Mientras cambia de módulo la tarjeta se oculta, para no verla en una posición vieja.
const cambiando = ref(true)
const posicionTarjeta = ref({ top: '12px', left: '12px' })

const paso = computed(() => PASOS[tour.indice])
const esUltimo = computed(() => tour.indice === PASOS.length - 1)
const progreso = computed(() => `${((tour.indice + 1) / PASOS.length) * 100}%`)

const MARGEN = 10
const RESORTE = { type: 'spring', stiffness: 220, damping: 28 }
let elementoActual = null
let turno = 0

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

// Espera a que la vista monte el elemento resaltado (la navegación tiene animación de entrada).
async function buscarObjetivo(nombre) {
  if (!nombre) return null
  for (let i = 0; i < 40; i += 1) {
    const el = document.querySelector(`[data-tour="${nombre}"]`)
    if (el && el.getBoundingClientRect().width > 0) return el
    await espera(60)
  }
  return null
}

// Si el elemento es más alto que el espacio que deja la tarjeta (pasa en celular con los
// formularios), el resaltado se recorta para que la tarjeta entre debajo sin taparlo.
function rectDe(el) {
  const r = el.getBoundingClientRect()
  const top = Math.max(r.top - MARGEN, 4)
  const altoTarjeta = tarjeta.value?.offsetHeight ?? 0
  const libre = window.innerHeight - altoTarjeta - 32 - top
  let height = Math.min(r.height + MARGEN * 2, window.innerHeight - 8)
  if (height + altoTarjeta + 32 > window.innerHeight - top && libre > 80) height = libre
  return {
    left: Math.max(r.left - MARGEN, 4),
    top,
    width: Math.min(r.width + MARGEN * 2, window.innerWidth - 8),
    height
  }
}

// Lleva el elemento a la vista. Si no entra junto con la tarjeta, lo deja pegado arriba.
async function traerAVista(el) {
  const r = el.getBoundingClientRect()
  const altoTarjeta = tarjeta.value?.offsetHeight ?? 0
  const noEntra = r.height + altoTarjeta + 48 > window.innerHeight
  const comportamiento = reducido() ? 'auto' : 'smooth'
  if (noEntra && Math.abs(r.top - 24) > 4) {
    window.scrollBy({ top: r.top - 24, behavior: comportamiento })
  } else if (!noEntra && (r.top < 0 || r.bottom > window.innerHeight)) {
    el.scrollIntoView({ block: 'center', behavior: comportamiento })
  } else {
    return
  }
  await espera(reducido() ? 0 : 420)
}

// Ubica la tarjeta debajo, arriba o al costado del resaltado, siempre dentro de la pantalla.
function ubicarTarjeta(rect) {
  const t = tarjeta.value
  if (!t) return
  const ancho = t.offsetWidth
  const alto = t.offsetHeight
  const vw = window.innerWidth
  const vh = window.innerHeight
  // Siempre en píxeles: Motion anima transform, así que no se puede centrar con translate(-50%).
  if (!rect) {
    posicionTarjeta.value = { top: `${Math.max((vh - alto) / 2, 12)}px`, left: `${Math.max((vw - ancho) / 2, 12)}px` }
    return
  }
  const separacion = 16
  let top
  let left
  if (rect.top + rect.height + separacion + alto <= vh - 12) top = rect.top + rect.height + separacion
  else if (rect.top - separacion - alto >= 12) top = rect.top - separacion - alto
  else if (rect.left + rect.width + separacion + ancho <= vw - 12) {
    left = rect.left + rect.width + separacion
    top = Math.min(Math.max(rect.top, 12), vh - alto - 12)
  } else {
    top = Math.max(vh - alto - 12, 12)
  }
  if (left === undefined) left = Math.min(Math.max(rect.left, 12), vw - ancho - 12)
  posicionTarjeta.value = { top: `${top}px`, left: `${left}px` }
}

function moverFoco(rect, animado) {
  const el = foco.value
  if (!el) return
  const destino = rect ?? { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 }
  const valores = { left: `${destino.left}px`, top: `${destino.top}px`, width: `${destino.width}px`, height: `${destino.height}px` }
  if (!animado || reducido()) Object.assign(el.style, valores)
  else animate(el, valores, RESORTE)
}

// Motion graphics de cada paso: la tarjeta entra con un resorte y el ícono se dibuja trazo a trazo.
function animarEntrada() {
  if (reducido()) return
  if (tarjeta.value) {
    animate(tarjeta.value, { opacity: [0, 1], scale: [0.94, 1], y: [14, 0] }, { type: 'spring', stiffness: 260, damping: 24 })
  }
  const trazos = icono.value?.querySelectorAll('path') ?? []
  if (trazos.length) {
    animate(trazos, { strokeDashoffset: [1, 0] }, { duration: 0.7, delay: stagger(0.12, { startDelay: 0.15 }), ease: [0.22, 1, 0.36, 1] })
  }
  if (icono.value) {
    animate(icono.value, { rotate: [-12, 0], scale: [0.6, 1] }, { type: 'spring', stiffness: 300, damping: 14 })
  }
}

// Al terminar, una lluvia de chispas sale desde la tarjeta.
function festejar() {
  if (reducido() || !chispas.value) return
  const puntos = chispas.value.querySelectorAll('span')
  puntos.forEach((p, i) => {
    const angulo = (i / puntos.length) * Math.PI * 2
    const distancia = 90 + (i % 3) * 40
    animate(p, {
      x: [0, Math.cos(angulo) * distancia],
      y: [0, Math.sin(angulo) * distancia],
      opacity: [1, 0],
      scale: [1, 0.4]
    }, { duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: i * 0.015 })
  })
}

async function mostrarPaso() {
  const miTurno = ++turno
  const p = paso.value
  if (p.ruta && route.path !== p.ruta) {
    cambiando.value = true
    await router.push(p.ruta)
  }
  const el = await buscarObjetivo(p.objetivo)
  if (miTurno !== turno || !tour.activo) return
  elementoActual = el
  conObjetivo.value = Boolean(el)
  await nextTick() // la tarjeta ya tiene el texto nuevo: su alto sirve para ubicar todo
  if (el) {
    await traerAVista(el)
    if (miTurno !== turno) return
  }
  const rect = el ? rectDe(el) : null
  moverFoco(rect, true)
  await nextTick()
  ubicarTarjeta(rect)
  cambiando.value = false
  animarEntrada()
  siguiente.value?.focus({ preventScroll: true })
  if (p.id === 'fin') festejar()
}

function recalcular() {
  if (!tour.activo) return
  const rect = elementoActual && document.contains(elementoActual) ? rectDe(elementoActual) : null
  moverFoco(rect, false)
  ubicarTarjeta(rect)
}

function cerrar() {
  marcarTourVisto(sesion.usuario?.id)
  terminarTour()
}

function avanzar() {
  if (esUltimo.value) cerrar()
  else siguientePaso()
}

function teclado(e) {
  if (!tour.activo) return
  if (e.key === 'Escape') cerrar()
  else if (e.key === 'ArrowRight') avanzar()
  else if (e.key === 'ArrowLeft') pasoAnterior()
}

watch(
  () => [tour.activo, tour.indice],
  async ([activo]) => {
    if (!activo) {
      elementoActual = null
      window.removeEventListener('resize', recalcular)
      window.removeEventListener('scroll', recalcular, true)
      window.removeEventListener('keydown', teclado)
      return
    }
    window.addEventListener('resize', recalcular)
    window.addEventListener('scroll', recalcular, true)
    window.addEventListener('keydown', teclado)
    await nextTick()
    await mostrarPaso()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', recalcular)
  window.removeEventListener('scroll', recalcular, true)
  window.removeEventListener('keydown', teclado)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="tour.activo" class="tour" data-tour-activo>
      <!-- Capa que bloquea la app mientras dura el tour; el hueco del foco deja ver lo resaltado. -->
      <div class="bloqueo" :class="{ oscuro: !conObjetivo }" aria-hidden="true" />
      <div ref="foco" class="foco" :class="{ visible: conObjetivo }" aria-hidden="true" />

      <div
        ref="tarjeta"
        class="tarjeta"
        :class="{ oculta: cambiando }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-titulo"
        aria-describedby="tour-texto"
        :style="posicionTarjeta"
      >
        <div ref="chispas" class="chispas" aria-hidden="true">
          <span v-for="n in 18" :key="n" :style="{ background: n % 2 ? 'var(--primario)' : 'var(--acento)' }" />
        </div>
        <div class="barra" aria-hidden="true"><div class="relleno" :style="{ width: progreso }" /></div>
        <div class="cabecera">
          <svg ref="icono" :key="paso.id" class="icono" viewBox="0 0 24 24" aria-hidden="true">
            <path v-for="d in paso.icono" :key="d" :d="d" pathLength="1" />
          </svg>
          <p class="contador">Paso {{ tour.indice + 1 }} de {{ PASOS.length }}</p>
        </div>
        <h2 id="tour-titulo">{{ paso.titulo }}</h2>
        <p id="tour-texto" class="texto">{{ paso.texto }}</p>
        <ul v-if="paso.consejos?.length" class="consejos">
          <li v-for="c in paso.consejos" :key="c">{{ c }}</li>
        </ul>

        <div class="puntos" role="group" aria-label="Ir a un paso">
          <button
            v-for="(p, i) in PASOS"
            :key="p.id"
            type="button"
            class="punto"
            :class="{ actual: i === tour.indice, hecho: i < tour.indice }"
            :aria-label="`Paso ${i + 1}: ${p.titulo}`"
            :aria-current="i === tour.indice ? 'step' : undefined"
            @click="irAPaso(i)"
          />
        </div>

        <div class="acciones">
          <button type="button" class="saltar" data-tour-saltar @click="cerrar">{{ esUltimo ? 'Cerrar' : 'Saltar' }}</button>
          <div class="navegar">
            <button v-if="tour.indice > 0" type="button" data-tour-anterior @click="pasoAnterior">Anterior</button>
            <button ref="siguiente" type="button" class="primario" data-tour-siguiente @click="avanzar">
              {{ esUltimo ? '¡Empezar!' : tour.indice === 0 ? 'Mostrame' : 'Siguiente' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tour { position: fixed; inset: 0; z-index: 300; }
/* Sin objetivo, la capa de bloqueo oscurece toda la pantalla. */
.bloqueo { position: absolute; inset: 0; background: transparent; transition: background 0.3s ease; }
.bloqueo.oscuro { background: rgba(5, 10, 25, 0.66); }

/* Con objetivo, el foco oscurece todo menos su recuadro con una sombra enorme. */
.foco {
  position: fixed; left: 50%; top: 50%; width: 0; height: 0; border-radius: 14px;
  box-shadow: 0 0 0 200vmax rgba(5, 10, 25, 0.66);
  pointer-events: none; opacity: 0; transition: opacity 0.3s ease;
}
.foco.visible { opacity: 1; outline: 2px solid var(--primario); outline-offset: 2px; animation: latido 1.8s ease-in-out infinite; }
.tarjeta.oculta { visibility: hidden; }
@keyframes latido {
  0%, 100% { outline-color: var(--primario); outline-offset: 2px; }
  50% { outline-color: var(--acento); outline-offset: 6px; }
}

.tarjeta {
  position: fixed; width: min(380px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto;
  padding: 20px 20px 16px; border-radius: var(--radio); background: var(--superficie); color: var(--texto);
  border: 1px solid var(--borde); box-shadow: var(--sombra-elevada), 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.chispas { position: absolute; left: 50%; top: 40px; width: 0; height: 0; pointer-events: none; }
.chispas span { position: absolute; width: 8px; height: 8px; margin: -4px; border-radius: 50%; opacity: 0; }

.barra { height: 4px; margin: -20px -20px 16px; background: var(--borde); border-radius: var(--radio) var(--radio) 0 0; overflow: hidden; }
.relleno { height: 100%; background: var(--gradiente-primario); transition: width 0.45s cubic-bezier(0.22, 1, 0.36, 1); }

.cabecera { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.icono {
  flex: none; width: 44px; height: 44px; padding: 9px; border-radius: 12px;
  background: var(--primario-suave); fill: none; stroke: var(--primario); stroke-width: 1.8;
  stroke-linecap: round; stroke-linejoin: round;
}
.icono path { stroke-dasharray: 1; stroke-dashoffset: 0; }
.contador { margin: 0; color: var(--texto-suave); font-size: 0.85rem; font-weight: 600; }

h2 { margin: 0 0 6px; font-size: 1.2rem; letter-spacing: -0.01em; }
.texto { margin: 0 0 10px; color: var(--texto-suave); line-height: 1.5; }
.consejos { margin: 0 0 12px; padding-left: 18px; color: var(--texto); font-size: 0.92rem; line-height: 1.5; }

.puntos { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 14px; }
.punto {
  min-height: 0; width: 8px; height: 8px; padding: 0; border: 0; border-radius: 4px;
  background: var(--borde); cursor: pointer; transition: width 0.3s ease, background 0.3s ease;
}
.punto.hecho { background: var(--primario-suave); }
.punto.actual { width: 22px; background: var(--primario); }

.acciones { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.navegar { display: flex; gap: 8px; }
.acciones button { padding: 0 14px; border-radius: var(--radio-chico); border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; font-weight: 600; }
.acciones button.primario { background: var(--primario); color: var(--primario-texto); border-color: var(--primario); }
.acciones .saltar { border-color: transparent; background: none; color: var(--texto-suave); }

@media (prefers-reduced-motion: reduce) {
  .foco.visible { animation: none; }
  .relleno, .punto { transition: none; }
}
</style>
