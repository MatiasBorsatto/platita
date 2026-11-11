<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { animate, stagger } from 'motion'
import { PASOS } from '../tour/pasos.js'
import { tour, siguientePaso, pasoAnterior, terminarTour, marcarTourVisto } from '../services/tour.js'
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
// Mientras cambia de paso la tarjeta se oculta, para no verla en una posición vieja.
const cambiando = ref(true)
const posicionTarjeta = ref({ top: '12px', left: '12px' })

const paso = computed(() => PASOS[tour.indice])
const esUltimo = computed(() => tour.indice === PASOS.length - 1)
const progreso = computed(() => `${((tour.indice + 1) / PASOS.length) * 100}%`)

const MARGEN = 8 // aire entre el elemento y el recuadro
const SEPARACION = 14 // entre el recuadro y la tarjeta
const BORDE = 12 // distancia mínima a los bordes de la pantalla
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

// El recuadro rodea el elemento completo; solo se recorta si el elemento sale de la pantalla.
function rectDe(el) {
  const r = el.getBoundingClientRect()
  const left = Math.max(r.left - MARGEN, 4)
  const top = Math.max(r.top - MARGEN, 4)
  const right = Math.min(r.right + MARGEN, window.innerWidth - 4)
  const bottom = Math.min(r.bottom + MARGEN, window.innerHeight - 4)
  return { left, top, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) }
}

const medidasTarjeta = () => ({ ancho: tarjeta.value?.offsetWidth ?? 0, alto: tarjeta.value?.offsetHeight ?? 0 })

// Busca un lugar para la tarjeta que no tape el recuadro: abajo, arriba, a la derecha o a la izquierda.
function lugarLibre(rect, ancho, alto) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const enX = (x) => Math.min(Math.max(x, BORDE), vw - ancho - BORDE)
  const enY = (y) => Math.min(Math.max(y, BORDE), vh - alto - BORDE)
  const abajo = rect.top + rect.height + SEPARACION
  if (abajo + alto <= vh - BORDE) return { top: abajo, left: enX(rect.left) }
  const arriba = rect.top - SEPARACION - alto
  if (arriba >= BORDE) return { top: arriba, left: enX(rect.left) }
  const derecha = rect.left + rect.width + SEPARACION
  if (derecha + ancho <= vw - BORDE) return { top: enY(rect.top), left: derecha }
  const izquierda = rect.left - SEPARACION - ancho
  if (izquierda >= BORDE) return { top: enY(rect.top), left: izquierda }
  return null
}

// Ubica la tarjeta y devuelve el recuadro definitivo. Si el elemento es tan alto que no queda
// lugar libre (pasa en celular con formularios largos), la tarjeta va abajo y el recuadro
// se acorta hasta ella, para que nunca quede tapado.
function ubicarTarjeta(rect) {
  const { ancho, alto } = medidasTarjeta()
  const vw = window.innerWidth
  const vh = window.innerHeight
  // Siempre en píxeles: Motion anima transform, así que no se puede centrar con translate(-50%).
  let lugar = rect ? lugarLibre(rect, ancho, alto) : { top: (vh - alto) / 2, left: (vw - ancho) / 2 }
  let recuadro = rect
  if (!lugar) {
    lugar = vw >= 768 ? { top: vh - alto - 24, left: vw - ancho - 24 } : { top: vh - alto - BORDE, left: BORDE }
    const tapa = rect.left < lugar.left + ancho && rect.left + rect.width > lugar.left
    const disponible = lugar.top - SEPARACION - rect.top
    if (tapa && disponible > 60) recuadro = { ...rect, height: Math.min(rect.height, disponible) }
  }
  posicionTarjeta.value = { top: `${Math.max(lugar.top, BORDE)}px`, left: `${Math.max(lugar.left, BORDE)}px` }
  return recuadro
}

// Desplaza la página solo si hace falta para ver el elemento completo y la tarjeta al lado.
async function traerAVista(el) {
  const r = el.getBoundingClientRect()
  const vh = window.innerHeight
  const { ancho, alto } = medidasTarjeta()
  const visible = r.top - MARGEN >= BORDE && r.bottom + MARGEN <= vh - BORDE
  if (visible && lugarLibre(rectDe(el), ancho, alto)) return

  const altoRecuadro = r.height + MARGEN * 2
  const entraConTarjetaDebajo = altoRecuadro + SEPARACION + alto + BORDE * 2 <= vh
  const entraSolo = altoRecuadro + BORDE * 2 <= vh
  const vw = window.innerWidth
  const hayLado = r.right + MARGEN + SEPARACION + ancho <= vw - BORDE || r.left - MARGEN - SEPARACION - ancho >= BORDE
  // Por defecto el elemento sube arriba de todo y la tarjeta va debajo. Si la tarjeta
  // puede ir al costado, el elemento se centra.
  let destino = BORDE + MARGEN
  if (!entraConTarjetaDebajo && entraSolo && hayLado) destino = (vh - r.height) / 2
  const maximo = document.documentElement.scrollHeight - vh
  const objetivo = Math.min(Math.max(window.scrollY + r.top - destino, 0), maximo)
  if (Math.abs(objetivo - window.scrollY) < 4) return
  window.scrollTo({ top: objetivo, behavior: reducido() ? 'auto' : 'smooth' })
  await espera(reducido() ? 0 : 450)
  // Si el desplazamiento suave no llegó (pestaña en segundo plano), se completa sin animación.
  if (Math.abs(window.scrollY - objetivo) > 2) window.scrollTo({ top: objetivo, behavior: 'instant' })
}

function moverFoco(rect, animado) {
  const el = foco.value
  if (!el) return
  const destino = rect ?? { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 }
  const valores = { left: `${destino.left}px`, top: `${destino.top}px`, width: `${destino.width}px`, height: `${destino.height}px` }
  // La posición final queda fijada de entrada; la animación solo recorre el camino desde la anterior.
  const r = el.getBoundingClientRect()
  const desde = { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` }
  Object.assign(el.style, valores)
  if (!animado || reducido()) return
  animate(el, Object.fromEntries(Object.keys(valores).map((k) => [k, [desde[k], valores[k]]])), RESORTE)
}

// Motion graphics de cada paso: la tarjeta entra con un resorte, el ícono se dibuja trazo a trazo
// y los consejos aparecen en cascada.
function animarEntrada() {
  if (reducido() || !tarjeta.value) return
  animate(tarjeta.value, { opacity: [0, 1], scale: [0.95, 1], y: [12, 0] }, { type: 'spring', stiffness: 260, damping: 24 })
  const trazos = icono.value?.querySelectorAll('path') ?? []
  if (trazos.length) {
    animate(trazos, { strokeDashoffset: [1, 0] }, { duration: 0.7, delay: stagger(0.12, { startDelay: 0.15 }), ease: [0.22, 1, 0.36, 1] })
  }
  if (icono.value) animate(icono.value, { rotate: [-14, 0], scale: [0.6, 1] }, { type: 'spring', stiffness: 300, damping: 14 })
  const bloques = tarjeta.value.querySelectorAll('[data-entra]')
  if (bloques.length) {
    animate(bloques, { opacity: [0, 1], x: [-8, 0] }, { duration: 0.35, delay: stagger(0.07, { startDelay: 0.12 }), ease: [0.22, 1, 0.36, 1] })
  }
}

// Al terminar, una lluvia de chispas sale desde el ícono.
function festejar() {
  if (reducido() || !chispas.value) return
  const puntos = chispas.value.querySelectorAll('span')
  puntos.forEach((p, i) => {
    const angulo = (i / puntos.length) * Math.PI * 2
    const distancia = 80 + (i % 3) * 40
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
  cambiando.value = true
  if (p.ruta && route.path !== p.ruta) await router.push(p.ruta)
  const el = await buscarObjetivo(p.objetivo)
  if (miTurno !== turno || !tour.activo) return
  elementoActual = el
  conObjetivo.value = Boolean(el)
  await nextTick() // la tarjeta ya tiene el texto nuevo: su tamaño sirve para ubicar todo
  if (el) {
    await traerAVista(el)
    if (miTurno !== turno) return
  }
  moverFoco(ubicarTarjeta(el ? rectDe(el) : null), true)
  cambiando.value = false
  animarEntrada()
  siguiente.value?.focus({ preventScroll: true })
  if (p.id === 'fin') festejar()
}

function recalcular() {
  if (!tour.activo || cambiando.value) return
  const rect = elementoActual && document.contains(elementoActual) ? rectDe(elementoActual) : null
  moverFoco(ubicarTarjeta(rect), false)
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

// Durante el tour la página tiene espacio extra al final: así cualquier elemento puede subir
// y dejar lugar a la tarjeta debajo, aunque la vista sea corta. Se quita al terminar.
function espacioExtra(activo) {
  document.body.style.paddingBottom = activo ? '70vh' : ''
}

function escuchar(activo) {
  espacioExtra(activo)
  const metodo = activo ? 'addEventListener' : 'removeEventListener'
  window[metodo]('resize', recalcular)
  window[metodo]('scroll', recalcular, true)
  window[metodo]('keydown', teclado)
}

watch(
  () => [tour.activo, tour.indice],
  async ([activo]) => {
    escuchar(false)
    if (!activo) {
      elementoActual = null
      return
    }
    escuchar(true)
    await nextTick()
    await mostrarPaso()
  },
  { immediate: true }
)

onBeforeUnmount(() => escuchar(false))
</script>

<template>
  <Teleport to="body">
    <div v-if="tour.activo" class="tour" data-tour-activo>
      <!-- Capa que bloquea la app mientras dura el tour; el hueco del recuadro deja ver lo resaltado. -->
      <div class="bloqueo" :class="{ oscuro: !conObjetivo }" aria-hidden="true" />
      <div ref="foco" class="foco" :class="{ visible: conObjetivo }" aria-hidden="true" />

      <article
        ref="tarjeta"
        class="tarjeta"
        :class="{ oculta: cambiando }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-titulo"
        aria-describedby="tour-texto"
        :style="posicionTarjeta"
      >
        <header class="cabecera">
          <div class="icono-marco">
            <div ref="chispas" class="chispas" aria-hidden="true">
              <span v-for="n in 18" :key="n" :class="n % 2 ? 'uno' : 'dos'" />
            </div>
            <svg ref="icono" :key="paso.id" class="icono" viewBox="0 0 24 24" aria-hidden="true">
              <path v-for="d in paso.icono" :key="d" :d="d" pathLength="1" />
            </svg>
          </div>
          <div class="ubicacion">
            <span class="modulo">{{ paso.modulo }}</span>
            <span class="contador">Paso {{ tour.indice + 1 }} de {{ PASOS.length }}</span>
          </div>
          <button type="button" class="cerrar" data-tour-saltar aria-label="Salir del recorrido" title="Salir (Esc)" @click="cerrar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6 6 18" /></svg>
          </button>
        </header>

        <h2 id="tour-titulo" data-entra>{{ paso.titulo }}</h2>
        <p id="tour-texto" class="texto" data-entra>{{ paso.texto }}</p>

        <ul v-if="paso.consejos?.length" class="consejos">
          <li v-for="c in paso.consejos" :key="c" data-entra>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
            <span>{{ c }}</span>
          </li>
        </ul>

        <footer class="pie">
          <div class="progreso" role="progressbar" :aria-valuenow="tour.indice + 1" aria-valuemin="1" :aria-valuemax="PASOS.length" aria-label="Avance del recorrido">
            <div class="relleno" :style="{ width: progreso }" />
          </div>
          <div class="botones">
            <button v-if="tour.indice > 0" type="button" class="secundario" data-tour-anterior @click="pasoAnterior">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
              Anterior
            </button>
            <button ref="siguiente" type="button" class="principal" data-tour-siguiente @click="avanzar">
              {{ esUltimo ? '¡Empezar!' : tour.indice === 0 ? 'Mostrame' : 'Siguiente' }}
              <svg v-if="!esUltimo" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </footer>
      </article>
    </div>
  </Teleport>
</template>

<style scoped>
.tour { position: fixed; inset: 0; z-index: 300; }

/* Sin objetivo, la capa de bloqueo oscurece toda la pantalla. */
.bloqueo { position: absolute; inset: 0; background: transparent; transition: background 0.3s ease; }
.bloqueo.oscuro { background: rgba(5, 10, 25, 0.7); }

/* Con objetivo, el recuadro oscurece todo menos su interior con una sombra enorme. */
.foco {
  position: fixed; left: 50%; top: 50%; width: 0; height: 0; border-radius: 16px;
  box-shadow: 0 0 0 200vmax rgba(5, 10, 25, 0.7);
  pointer-events: none; opacity: 0; transition: opacity 0.3s ease;
}
.foco.visible {
  opacity: 1;
  outline: 2px solid var(--primario); outline-offset: 0;
  animation: latido 2s ease-in-out infinite;
}
@keyframes latido {
  0%, 100% { outline-color: var(--primario); box-shadow: 0 0 0 200vmax rgba(5, 10, 25, 0.7), 0 0 0 0 rgba(45, 212, 168, 0.35); }
  50% { outline-color: var(--acento); box-shadow: 0 0 0 200vmax rgba(5, 10, 25, 0.7), 0 0 0 6px rgba(45, 212, 168, 0.18); }
}

/* Tarjeta */
.tarjeta {
  position: fixed; width: min(380px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto;
  padding: 18px 20px 16px; border-radius: 18px; color: var(--texto);
  background:
    radial-gradient(120% 70% at 0% 0%, var(--primario-suave), transparent 60%),
    var(--superficie);
  border: 1px solid var(--borde);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2);
}
.tarjeta.oculta { visibility: hidden; }

.cabecera { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.icono-marco {
  position: relative; flex: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px;
  background: var(--gradiente-primario); box-shadow: 0 6px 16px rgba(11, 125, 99, 0.35);
}
.icono { width: 24px; height: 24px; fill: none; stroke: #ffffff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.icono path { stroke-dasharray: 1; stroke-dashoffset: 0; }

.ubicacion { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.modulo { color: var(--primario); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.contador { color: var(--texto-suave); font-size: 0.82rem; }

.cerrar {
  flex: none; display: grid; place-items: center; width: 36px; height: 36px; min-height: 0; padding: 0;
  border: 0; border-radius: 10px; background: transparent; color: var(--texto-suave); cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}
.cerrar:hover { background: var(--borde); color: var(--texto); }
.cerrar svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; }

h2 { margin: 0 0 6px; font-size: 1.25rem; font-weight: 800; line-height: 1.25; letter-spacing: -0.015em; }
.texto { margin: 0; color: var(--texto-suave); font-size: 0.96rem; line-height: 1.55; }

.consejos { display: grid; gap: 8px; margin: 14px 0 0; padding: 0; list-style: none; }
.consejos li {
  display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 12px;
  background: var(--primario-suave); color: var(--texto); font-size: 0.9rem; line-height: 1.45;
}
.consejos svg { flex: none; width: 16px; height: 16px; margin-top: 2px; fill: none; stroke: var(--primario); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }

.pie { margin-top: 18px; }
.progreso { height: 4px; border-radius: 2px; background: var(--borde); overflow: hidden; }
.relleno { height: 100%; border-radius: 2px; background: var(--gradiente-primario); transition: width 0.45s cubic-bezier(0.22, 1, 0.36, 1); }

.botones { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.botones button {
  display: inline-flex; align-items: center; gap: 6px; height: 42px; min-height: 0; padding: 0 16px;
  border-radius: 11px; font-weight: 700; cursor: pointer; transition: filter 0.2s ease, background 0.2s ease;
}
.botones svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.secundario { margin-right: auto; border: 1px solid var(--borde); background: transparent; color: var(--texto); }
.secundario:hover { background: var(--borde); }
.principal { border: 0; background: var(--primario); color: var(--primario-texto); box-shadow: 0 6px 16px rgba(11, 125, 99, 0.3); }
.principal:hover { filter: brightness(1.06); }

/* Chispas del final */
.chispas { position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; }
.chispas span { position: absolute; width: 8px; height: 8px; margin: -4px; border-radius: 50%; opacity: 0; }
.chispas .uno { background: var(--primario); }
.chispas .dos { background: var(--acento); }

/* En celular la tarjeta es más compacta para dejar más pantalla al elemento resaltado. */
@media (max-width: 767px) {
  .tarjeta { padding: 14px 16px 14px; border-radius: 16px; }
  .cabecera { margin-bottom: 10px; }
  .icono-marco { width: 38px; height: 38px; border-radius: 11px; }
  .icono { width: 20px; height: 20px; }
  h2 { font-size: 1.08rem; }
  .texto { font-size: 0.9rem; line-height: 1.5; }
  .consejos { gap: 6px; margin-top: 10px; }
  .consejos li { padding: 8px 10px; font-size: 0.84rem; }
  .pie { margin-top: 12px; }
  .botones { margin-top: 10px; }
  .botones button { height: 40px; padding: 0 14px; }
}

@media (prefers-reduced-motion: reduce) {
  .foco.visible { animation: none; }
  .relleno, .cerrar, .botones button, .bloqueo, .foco { transition: none; }
}
</style>
