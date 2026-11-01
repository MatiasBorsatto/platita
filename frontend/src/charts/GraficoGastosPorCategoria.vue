<script setup>
import { ref, computed } from 'vue'
import { useGrafico, opcionesBase, colorSerie, paraEje } from './base.js'
import { formatearMonto } from '../utils/formato.js'

// datos: [{ categoriaId, nombre, monto }] tal como los devuelve la API.
const props = defineProps({ datos: { type: Array, default: () => [] } })
const canvas = ref(null)

const alternativo = computed(
  () => `Gráfico de anillo de gastos por categoría. ${props.datos.length} categorías; los valores están en la tabla.`
)

useGrafico(canvas, () => props.datos, () => ({
  type: 'doughnut',
  data: {
    labels: props.datos.map((d) => d.nombre),
    datasets: [{
      label: 'Gastos',
      data: props.datos.map((d) => paraEje(d.monto)),
      backgroundColor: props.datos.map((_, i) => colorSerie(i))
    }]
  },
  options: opcionesBase({ ejes: false })
}))
</script>

<template>
  <figure class="grafico">
    <figcaption>Gastos por categoría</figcaption>
    <div class="lienzo"><canvas ref="canvas" role="img" :aria-label="alternativo"></canvas></div>
    <table class="solo-lectores">
      <caption>Gastos por categoría</caption>
      <thead><tr><th scope="col">Categoría</th><th scope="col">Monto</th></tr></thead>
      <tbody>
        <tr v-for="(d, i) in datos" :key="d.categoriaId ?? `sin-${i}`">
          <th scope="row">{{ d.nombre }}</th><td>{{ formatearMonto(d.monto) }}</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>

<style scoped>
.grafico { margin: 0; position: relative; min-width: 0; }
figcaption { font-weight: 600; margin-bottom: 8px; }
.lienzo { position: relative; width: 100%; min-height: 240px; height: 280px; }
</style>
