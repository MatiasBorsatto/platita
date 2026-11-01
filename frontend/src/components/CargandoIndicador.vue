<script setup>
// Indicador de carga de la marca: un aro con gradiente que gira, el logo que late y puntos animados.
// Con variante "esqueleto" muestra filas que brillan mientras llegan los datos de una lista.
defineProps({
  texto: { type: String, default: 'Cargando' },
  variante: { type: String, default: 'aro' }
})
</script>

<template>
  <div v-if="variante === 'aro'" class="cargando" role="status" aria-live="polite">
    <div class="aro" aria-hidden="true">
      <span class="logo">P</span>
    </div>
    <p class="texto">
      {{ texto }}<span class="puntos" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
    </p>
  </div>

  <div v-else class="esqueleto" role="status" aria-live="polite">
    <span class="solo-lectores">{{ texto }}</span>
    <div v-for="n in 3" :key="n" class="fila" :style="{ animationDelay: `${(n - 1) * 0.15}s` }"></div>
  </div>
</template>

<style scoped>
.cargando {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 28px 16px; color: var(--texto-suave);
}

.aro {
  position: relative; display: grid; place-items: center;
  width: 64px; height: 64px; border-radius: 50%;
  animation: giro 1.1s linear infinite;
  background: conic-gradient(from 0deg, transparent 0deg, var(--primario) 120deg, var(--acento) 240deg, transparent 360deg);
  -webkit-mask: radial-gradient(circle, transparent 23px, #000 24px);
          mask: radial-gradient(circle, transparent 23px, #000 24px);
}

.logo {
  position: absolute; inset: 0; display: grid; place-items: center;
  font-weight: 800; font-size: 1.1rem; color: var(--primario);
  animation: latido 1.6s ease-in-out infinite;
}

.texto { margin: 0; font-size: 0.95rem; font-weight: 500; }

.puntos i {
  display: inline-block; font-style: normal; animation: rebote 1.2s ease-in-out infinite;
}
.puntos i:nth-child(2) { animation-delay: 0.15s; }
.puntos i:nth-child(3) { animation-delay: 0.3s; }

.esqueleto { display: grid; gap: 12px; padding: 8px 0; }
.solo-lectores {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.fila {
  height: 56px; border-radius: var(--radio-chico);
  background: linear-gradient(90deg, var(--superficie-elevada) 0%, var(--borde) 50%, var(--superficie-elevada) 100%);
  background-size: 200% 100%;
  animation: brillo 1.4s ease-in-out infinite;
}

@keyframes giro { to { transform: rotate(360deg); } }
@keyframes latido {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.18); }
}
@keyframes rebote {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
  40% { transform: translateY(-5px); opacity: 1; }
}
@keyframes brillo {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
</style>
