<script setup>
import { computed, onMounted, ref } from 'vue'
import { formatearMonto } from '../utils/formato.js'
import { crecerBarra } from '../motion/movimiento.js'

// porcentaje y restante vienen calculados por la API; acá solo se muestran.
const props = defineProps({
  montoObjetivo: { type: String, required: true },
  acumulado: { type: String, required: true },
  porcentaje: { type: Number, required: true },
  restante: { type: String, required: true }
})

const porcentajeTexto = computed(() => String(props.porcentaje).replace('.', ','))
// Solo para dibujar la barra.
const ancho = computed(() => Math.max(0, Math.min(props.porcentaje, 100)))
const cumplida = computed(() => props.porcentaje >= 100)
const relleno = ref(null)

onMounted(() => crecerBarra(relleno.value, ancho.value))
</script>

<template>
  <div class="meta">
    <div
      class="barra"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="ancho"
      :aria-valuetext="`${porcentajeTexto} %`"
    >
      <div ref="relleno" class="relleno" :style="{ width: `${ancho}%` }"></div>
    </div>
    <p class="detalle">
      <strong>{{ porcentajeTexto }} %</strong>
      <span v-if="cumplida" class="etiqueta">Meta cumplida</span>
      <span class="montos">{{ formatearMonto(acumulado) }} de {{ formatearMonto(montoObjetivo) }}</span>
      <span class="montos">{{ formatearMonto(restante) }} restante</span>
    </p>
  </div>
</template>

<style scoped>
.barra { height: 12px; border-radius: 6px; background: var(--borde); overflow: hidden; }
.relleno { height: 100%; background: var(--primario); border-radius: 6px; }
.detalle { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; margin: 6px 0 0; font-size: 0.9rem; }
.montos { color: var(--texto-suave); }
.etiqueta { font-weight: 600; }
</style>
