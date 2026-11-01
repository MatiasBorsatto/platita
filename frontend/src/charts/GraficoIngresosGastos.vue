<script setup>
import { ref, computed } from 'vue'
import { useGrafico, opcionesBase, colorSerie, paraEje } from './base.js'
import { formatearMonto } from '../utils/formato.js'

// datos: [{ mes, ingresos, gastos }] tal como los devuelve la API.
const props = defineProps({ datos: { type: Array, default: () => [] } })
const canvas = ref(null)

const alternativo = computed(
  () => `Gráfico de barras de ingresos y gastos por mes. ${props.datos.length} meses; los valores están en la tabla.`
)

useGrafico(canvas, () => props.datos, () => ({
  type: 'bar',
  data: {
    labels: props.datos.map((d) => d.mes),
    datasets: [
      { label: 'Ingresos', data: props.datos.map((d) => paraEje(d.ingresos)), backgroundColor: colorSerie(0) },
      { label: 'Gastos', data: props.datos.map((d) => paraEje(d.gastos)), backgroundColor: colorSerie(1) }
    ]
  },
  options: opcionesBase()
}))
</script>

<template>
  <figure class="grafico">
    <figcaption>Ingresos y gastos</figcaption>
    <div class="lienzo"><canvas ref="canvas" role="img" :aria-label="alternativo"></canvas></div>
    <table class="solo-lectores">
      <caption>Ingresos y gastos por mes</caption>
      <thead><tr><th scope="col">Mes</th><th scope="col">Ingresos</th><th scope="col">Gastos</th></tr></thead>
      <tbody>
        <tr v-for="d in datos" :key="d.mes">
          <th scope="row">{{ d.mes }}</th><td>{{ formatearMonto(d.ingresos) }}</td><td>{{ formatearMonto(d.gastos) }}</td>
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
