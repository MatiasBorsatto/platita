<script setup>
import { red } from '../services/red.js'
</script>

<template>
  <div v-if="red.pendientes > 0" class="indicador" role="status" aria-live="polite">
    <span class="solo-lectores">Procesando…</span>
  </div>
</template>

<style scoped>
.indicador {
  position: fixed; top: 0; left: 0; right: 0; z-index: 200; height: 3px; overflow: hidden;
  background: var(--primario-suave);
}
.indicador::after {
  content: ''; position: absolute; inset: 0; width: 40%;
  background: var(--gradiente-primario); border-radius: 0 3px 3px 0;
  animation: recorrido 1.1s ease-in-out infinite;
}
.solo-lectores {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
@keyframes recorrido {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(260%); }
}
</style>
