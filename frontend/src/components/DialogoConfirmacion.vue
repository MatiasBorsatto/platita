<script setup>
import { nextTick, ref, watch } from 'vue'
import { dialogo, responder } from '../services/dialogo.js'
import { abrirPanel, cerrarPanel } from '../motion/movimiento.js'

const botonCancelar = ref(null)
let foco = null

// Devuelve el foco a quien lo tenía antes de abrir el diálogo.
watch(
  () => dialogo.abierto,
  async (abierto) => {
    if (abierto) {
      foco = document.activeElement
      await nextTick()
      botonCancelar.value?.focus()
    } else {
      foco?.focus?.()
      foco = null
    }
  }
)

function alTeclear(evento) {
  if (evento.key === 'Escape') responder(false)
}
</script>

<template>
  <Transition :css="false" @enter="abrirPanel" @leave="cerrarPanel">
    <div v-if="dialogo.abierto" class="velo" @keydown="alTeclear">
      <div
        class="dialogo"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialogo-titulo"
        aria-describedby="dialogo-mensaje"
      >
        <span class="insignia" :class="{ peligro: dialogo.peligroso }" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path v-if="dialogo.peligroso" d="M12 8v5M12 16.5h.01M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path v-else d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M8.5 12.5l2.5 2.5 4.5-5" /></svg>
        </span>
        <h2 id="dialogo-titulo">{{ dialogo.titulo }}</h2>
        <p id="dialogo-mensaje">{{ dialogo.mensaje }}</p>
        <div class="acciones">
          <button ref="botonCancelar" type="button" class="secundario" @click="responder(false)">{{ dialogo.cancelar }}</button>
          <button type="button" :class="dialogo.peligroso ? 'peligro' : 'principal'" @click="responder(true)">{{ dialogo.aceptar }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.velo {
  position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 16px;
  background: rgba(8, 12, 30, 0.55); backdrop-filter: blur(3px);
}
.dialogo {
  width: min(420px, 100%); padding: 24px; text-align: center;
  background: var(--superficie); color: var(--texto);
  border: 1px solid var(--borde); border-radius: var(--radio); box-shadow: var(--sombra-elevada);
}
.insignia {
  display: grid; place-items: center; width: 52px; height: 52px; margin: 0 auto 12px;
  border-radius: 50%; background: var(--primario-suave); color: var(--primario);
}
.insignia.peligro { background: var(--error-fondo); color: var(--error); }
.insignia svg { width: 26px; height: 26px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
h2 { margin: 0 0 8px; font-size: 1.2rem; }
p { margin: 0 0 22px; color: var(--texto-suave); line-height: 1.5; }
.acciones { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.acciones button { width: 100%; }
.secundario { background: var(--superficie-elevada); }
.principal { background: var(--primario); color: var(--primario-texto); border-color: var(--primario); }
.peligro { background: var(--error); color: #ffffff; border-color: var(--error); }
</style>
