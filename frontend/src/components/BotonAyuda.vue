<script setup>
import { onMounted, ref } from 'vue'
import { animate } from 'motion'
import { iniciarTour } from '../services/tour.js'
import { reducido } from '../motion/movimiento.js'

const boton = ref(null)

// Entra con un pequeño salto para que se note que existe.
onMounted(() => {
  if (reducido() || !boton.value) return
  animate(boton.value, { scale: [0, 1.15, 1], rotate: [-30, 0] }, { duration: 0.6, delay: 0.8, ease: [0.22, 1, 0.36, 1] })
})

function abrir() {
  if (!reducido() && boton.value) animate(boton.value, { scale: [1, 0.85, 1] }, { duration: 0.25 })
  iniciarTour(0)
}
</script>

<template>
  <button
    ref="boton"
    type="button"
    class="ayuda"
    data-tour="boton-ayuda"
    aria-label="Ver el recorrido por la app"
    title="¿Cómo se usa? Ver el recorrido"
    @click="abrir"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
    <span class="etiqueta">Ayuda</span>
  </button>
</template>

<style scoped>
.ayuda {
  position: fixed; right: 24px; bottom: 24px; z-index: 40;
  display: flex; align-items: center; gap: 0; height: 56px; min-width: 56px; padding: 0 16px;
  border: 0; border-radius: 28px; cursor: pointer;
  background: var(--gradiente-primario); color: #ffffff;
  box-shadow: 0 10px 24px rgba(11, 125, 99, 0.35), 0 0 0 0 rgba(45, 212, 168, 0.5);
  animation: onda 2.8s ease-out 2s 3;
  transition: gap 0.25s ease, box-shadow 0.25s ease;
}
.ayuda svg { width: 24px; height: 24px; flex: none; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }

/* La etiqueta aparece al pasar el mouse o con el foco del teclado. */
.etiqueta { max-width: 0; overflow: hidden; white-space: nowrap; font-weight: 700; transition: max-width 0.3s ease; }
.ayuda:hover, .ayuda:focus-visible { gap: 8px; box-shadow: 0 14px 30px rgba(11, 125, 99, 0.45); }
.ayuda:hover .etiqueta, .ayuda:focus-visible .etiqueta { max-width: 80px; }

@keyframes onda {
  0% { box-shadow: 0 10px 24px rgba(11, 125, 99, 0.35), 0 0 0 0 rgba(45, 212, 168, 0.5); }
  70% { box-shadow: 0 10px 24px rgba(11, 125, 99, 0.35), 0 0 0 18px rgba(45, 212, 168, 0); }
  100% { box-shadow: 0 10px 24px rgba(11, 125, 99, 0.35), 0 0 0 0 rgba(45, 212, 168, 0); }
}

/* En celular la barra de navegación ocupa el borde inferior: el botón va encima. */
@media (max-width: 767px) {
  .ayuda { right: 16px; bottom: 100px; height: 52px; min-width: 52px; padding: 0 14px; }
}

:global(html.movimiento-reducido) .ayuda { animation: none; transition: none; }
:global(html.movimiento-reducido) .etiqueta { transition: none; }
</style>
