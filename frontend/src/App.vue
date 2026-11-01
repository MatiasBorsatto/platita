<template>
  <IndicadorRed />
  <RouterView />
  <DialogoConfirmacion />
  <AvisosFlotantes />
</template>

<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue'
import DialogoConfirmacion from './components/DialogoConfirmacion.vue'
import IndicadorRed from './components/IndicadorRed.vue'
import AvisosFlotantes from './components/AvisosFlotantes.vue'
import { red } from './services/red.js'

// Mientras hay peticiones en curso, un segundo envío de formulario se descarta para no duplicar datos.
function bloquearDobleEnvio(evento) {
  if (red.pendientes > 0) {
    evento.preventDefault()
    evento.stopImmediatePropagation()
  }
}

onMounted(() => document.addEventListener('submit', bloquearDobleEnvio, true))
onBeforeUnmount(() => document.removeEventListener('submit', bloquearDobleEnvio, true))

// La clase en <body> es la que deshabilita los botones y muestra el giro en los de envío.
watch(
  () => red.pendientes > 0,
  (ocupado) => document.body.classList.toggle('procesando', ocupado)
)
</script>
