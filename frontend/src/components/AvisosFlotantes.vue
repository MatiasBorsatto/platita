<script setup>
import { avisos, cerrarAviso } from '../services/avisos.js'
</script>

<template>
  <div class="avisos" aria-live="polite">
    <TransitionGroup name="aviso">
      <div v-for="a in avisos.lista" :key="a.id" class="aviso" :class="a.tipo" role="status">
        <span class="icono" aria-hidden="true">
          <svg v-if="a.tipo === 'error'" viewBox="0 0 24 24"><path d="M12 8v5M12 16.5h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18" /></svg>
          <svg v-else viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
        <span class="texto">{{ a.mensaje }}</span>
        <button type="button" class="cerrar" aria-label="Cerrar aviso" @click="cerrarAviso(a.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.avisos {
  position: fixed; top: 16px; right: 16px; z-index: 150; display: grid; gap: 10px;
  width: min(360px, calc(100vw - 32px)); pointer-events: none;
}
.aviso {
  pointer-events: auto; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px;
  padding: 12px 12px 12px 14px; background: var(--superficie); color: var(--texto);
  border: 1px solid var(--borde); border-left: 4px solid var(--primario); border-radius: var(--radio-chico);
  box-shadow: var(--sombra-elevada); font-weight: 500;
}
.aviso.error { border-left-color: var(--error); }
.icono {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%;
  background: var(--primario-suave); color: var(--primario);
}
.aviso.error .icono { background: var(--error-fondo); color: var(--error); }
.icono svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.texto { min-width: 0; overflow-wrap: anywhere; }
.cerrar {
  min-height: 32px; width: 32px; padding: 0; border: 0; background: none; color: var(--texto-suave);
  font-size: 1.3rem; line-height: 1;
}
.aviso-enter-active { transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease; }
.aviso-leave-active { transition: transform 0.2s ease-in, opacity 0.2s ease-in; }
.aviso-enter-from { transform: translateX(24px) scale(0.96); opacity: 0; }
.aviso-leave-to { transform: translateX(24px); opacity: 0; }
@media (max-width: 767px) {
  .avisos { top: 12px; left: 12px; right: 12px; width: auto; }
}
</style>
