<script setup>
import { useRouter } from 'vue-router'
import { useSesion } from '../stores/sesion.js'
import CampanaNotificaciones from './CampanaNotificaciones.vue'
import IconosFlotantes from './IconosFlotantes.vue'
import { entrarPagina, salirPagina } from '../motion/movimiento.js'

const router = useRouter()
const sesion = useSesion()
// Ruta pública (carpeta public/): dinámica para que Vite no la convierta en import.
const logoUrl = '/logo.svg'

// Trazos SVG de 24x24 (estilo línea). Cada elemento del arreglo es un trazo.
const iconos = {
  movimientos: ['M7 17 17 7', 'M9 7h8v8'],
  presupuestos: ['M21 12A9 9 0 1 1 12 3v9h9'],
  tarjetas: ['M3 6h18v12H3z', 'M3 10h18', 'M7 15h4'],
  metas: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2'],
  grupos: ['M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M2 21a7 7 0 0 1 14 0', 'M16 3.1a4 4 0 0 1 0 7.8', 'M22 21a7 7 0 0 0-5-6.7'],
  estadisticas: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M2 20h20'],
  perfil: ['M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M4 21a8 8 0 0 1 16 0'],
  salir: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9']
}

const enlaces = [
  { to: '/movimientos', texto: 'Movimientos', icono: 'movimientos' },
  { to: '/presupuestos', texto: 'Presupuestos', icono: 'presupuestos' },
  { to: '/tarjetas', texto: 'Tarjetas', icono: 'tarjetas' },
  { to: '/metas', texto: 'Metas', icono: 'metas' },
  { to: '/grupos', texto: 'Grupos', icono: 'grupos' },
  { to: '/estadisticas', texto: 'Estadísticas', icono: 'estadisticas' }
]

async function salir() {
  await sesion.cerrarSesion()
  await router.push('/login')
}
</script>

<template>
  <div class="layout">
    <nav class="navegacion" aria-label="Principal">
      <div class="marca">
        <img class="logo" :src="logoUrl" alt="" width="34" height="34" />
        <strong>Platita</strong>
      </div>
      <CampanaNotificaciones />
      <RouterLink v-for="e in enlaces" :key="e.to" :to="e.to" class="enlace">
        <svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path v-for="d in iconos[e.icono]" :key="d" :d="d" /></svg>
        <span>{{ e.texto }}</span>
      </RouterLink>
      <RouterLink to="/perfil" class="enlace solo-escritorio">
        <svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path v-for="d in iconos.perfil" :key="d" :d="d" /></svg>
        <span>Perfil</span>
      </RouterLink>
      <button class="enlace salir" type="button" @click="salir">
        <svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path v-for="d in iconos.salir" :key="d" :d="d" /></svg>
        <span>Salir</span>
      </button>
    </nav>
    <main class="contenido">
      <IconosFlotantes />
      <RouterView v-slot="{ Component, route }">
        <Transition :css="false" mode="out-in" @enter="entrarPagina" @leave="salirPagina">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.layout { display: flex; min-height: 100vh; }

.navegacion {
  position: sticky; top: 0; z-index: 20; align-self: flex-start;
  display: flex; flex-direction: column; gap: 4px; width: 232px; height: 100dvh; padding: 20px 14px;
  background: var(--sidebar-fondo); color: var(--sidebar-texto);
  box-shadow: 4px 0 24px rgba(8, 12, 30, 0.18);
}

.marca { display: flex; align-items: center; gap: 10px; margin: 4px 8px 22px; color: #ffffff; font-size: 1.1rem; }
.logo { display: block; width: 34px; height: 34px; flex: none; }

.enlace {
  display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 10px 12px;
  border-radius: 10px; color: var(--sidebar-texto); text-decoration: none;
  background: none; border: 0; text-align: left; cursor: pointer; font-weight: 500;
}
.enlace:hover { background: rgba(255, 255, 255, 0.06); color: #ffffff; text-decoration: none; }
.enlace.router-link-active {
  background: var(--sidebar-activo); color: var(--sidebar-activo-texto); font-weight: 600;
  box-shadow: inset 3px 0 0 var(--primario);
}
.icono { flex: none; width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

.solo-escritorio { margin-top: auto; }
.salir { margin-top: 0; color: var(--sidebar-texto); font: inherit; }
.salir:hover { color: #fda4af; }

.contenido { position: relative; isolation: isolate; flex: 1; min-width: 0; padding: 32px 36px; }

@media (min-width: 768px) and (max-width: 1023px) {
  .navegacion { width: 196px; padding: 16px 10px; }
  .contenido { padding: 24px; }
}

@media (max-width: 767px) {
  .layout { flex-direction: column; }
  .marca { display: none; }
  .navegacion {
    position: fixed; top: auto; bottom: 12px; left: 12px; right: 12px; width: auto; height: auto; z-index: 10;
    display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); align-items: stretch;
    gap: 2px; padding: 8px; border-radius: 18px; border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: var(--sombra-elevada);
  }
  .enlace {
    flex-direction: column; justify-content: center; gap: 2px; min-height: 52px;
    padding: 6px 2px; font-size: 0.72rem; text-align: center; overflow-wrap: anywhere;
  }
  .enlace.router-link-active { box-shadow: inset 0 -3px 0 var(--primario); }
  .solo-escritorio { display: none; }
  .contenido { padding: 20px 16px 130px; }
}
</style>
