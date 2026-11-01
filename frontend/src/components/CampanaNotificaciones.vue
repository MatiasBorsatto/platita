<script setup>
import { computed, onMounted, ref } from 'vue'
import { listarNotificaciones, marcarLeida } from '../services/notificaciones.js'
import { abrirPanel, cerrarPanel } from '../motion/movimiento.js'

const notificaciones = ref([])
const abierta = ref(false)
const error = ref('')
const boton = ref(null)
const posicion = ref({})

const noLeidas = computed(() => notificaciones.value.filter((n) => !n.leida).length)

async function cargar() {
  try {
    notificaciones.value = await listarNotificaciones()
  } catch {
    error.value = 'No pudimos cargar las notificaciones.'
  }
}

async function marcar(n) {
  try {
    await marcarLeida(n.id)
    n.leida = true
  } catch {
    error.value = 'No pudimos marcar la notificación como leída.'
  }
}

// El panel se muestra fijo, junto al botón, para no tapar el contenido. En celular queda sobre la barra inferior.
function alternar() {
  if (!abierta.value) {
    const r = boton.value.getBoundingClientRect()
    posicion.value = window.innerWidth >= 768
      ? { left: `${r.right + 12}px`, top: `${Math.max(12, r.top - 8)}px` }
      : {}
  }
  abierta.value = !abierta.value
}

function cerrar() {
  abierta.value = false
  boton.value?.focus()
}

onMounted(cargar)
</script>

<template>
  <div class="campana-contenedor">
    <button
      ref="boton"
      class="campana"
      type="button"
      :aria-expanded="abierta"
      aria-controls="panel-notificaciones"
      :aria-label="`Notificaciones, ${noLeidas} sin leer`"
      @click="alternar"
    >
      <svg class="icono" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      <span class="texto">Notificaciones</span>
      <span v-if="noLeidas > 0" class="contador" data-testid="contador">{{ noLeidas }}</span>
    </button>
    <Transition :css="false" @enter="abrirPanel" @leave="cerrarPanel">
      <div v-if="abierta" id="panel-notificaciones" :style="posicion" class="panel" role="region" aria-label="Notificaciones" @keydown.esc="cerrar">
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p v-if="notificaciones.length === 0" class="vacio">No tenés notificaciones.</p>
        <ul v-else>
          <li v-for="n in notificaciones" :key="n.id" :class="{ leida: n.leida }">
            <span>{{ n.mensaje }}</span>
            <button v-if="!n.leida" type="button" :data-testid="`marcar-${n.id}`" @click="marcar(n)">
              Marcar como leída
            </button>
          </li>
        </ul>
        <RouterLink to="/perfil" class="ir-perfil solo-movil" @click="abierta = false">Mi perfil</RouterLink>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.campana-contenedor { position: relative; }
.campana {
  position: relative; display: flex; align-items: center; gap: 12px; width: 100%; min-height: 44px;
  padding: 10px 12px; background: none; border: 0; border-radius: 10px; cursor: pointer;
  color: var(--sidebar-texto); font-weight: 500; text-align: left;
}
.campana:hover { background: rgba(255, 255, 255, 0.06); color: #ffffff; }
.icono { flex: none; width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.contador {
  position: absolute; top: 6px; left: 22px; min-width: 18px; padding: 0 5px; border-radius: 9px;
  background: var(--insignia); color: var(--insignia-texto); font-size: 0.72rem; font-weight: 700; line-height: 18px; text-align: center;
  box-shadow: 0 0 0 2px var(--sidebar-fondo, #111a33);
}
@media (max-width: 767px) {
  .campana { flex-direction: column; justify-content: center; gap: 2px; font-size: 0.72rem; text-align: center; padding: 6px 2px; }
  .texto { font-size: 0.72rem; }
  .contador { top: 4px; left: 50%; margin-left: 6px; }
}
.panel {
  position: fixed; color: var(--texto); width: 300px; max-height: min(420px, 70vh); overflow: auto; z-index: 30;
  background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; padding: 8px;
}
@media (max-width: 767px) { .panel { left: 12px; right: 12px; bottom: 104px; width: auto; max-height: 50vh; } }
ul { list-style: none; margin: 0; padding: 0; }
li { display: flex; flex-direction: column; gap: 4px; padding: 8px; border-bottom: 1px solid var(--borde); }
li.leida { color: var(--texto-suave); }
.vacio, .error { margin: 0; padding: 8px; }
.solo-movil { display: none; }
@media (max-width: 767px) { .solo-movil { display: flex; } }
.ir-perfil {
  display: flex; align-items: center; min-height: 44px; margin-top: 4px; padding: 8px;
  border-top: 1px solid var(--borde); color: var(--texto); text-decoration: none;
}
</style>
