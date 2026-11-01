<script setup>
import { ref, computed } from 'vue'
import { useGrafico, opcionesBase, colorSerie, paraEje } from './base.js'
import { formatearMonto } from '../utils/formato.js'

// datos: [{ mes, saldos: [{ usuarioId, nombre, saldo }] }] ya procesados (con el nombre del miembro).
const props = defineProps({ datos: { type: Array, default: () => [] } })
const canvas = ref(null)

const miembros = computed(() => {
  const vistos = new Map()
  for (const d of props.datos) {
    for (const s of d.saldos) if (!vistos.has(s.usuarioId)) vistos.set(s.usuarioId, s.nombre ?? 'Ex miembro')
  }
  return [...vistos].map(([usuarioId, nombre]) => ({ usuarioId, nombre }))
})
const saldoDe = (d, usuarioId) => d.saldos.find((s) => s.usuarioId === usuarioId)?.saldo ?? '0.00'

const alternativo = computed(
  () => `Gráfico de líneas con el saldo de ${miembros.value.length} miembros del grupo por mes; los valores están en la tabla.`
)

useGrafico(canvas, () => props.datos, () => ({
  type: 'line',
  data: {
    labels: props.datos.map((d) => d.mes),
    datasets: miembros.value.map((m, i) => ({
      label: m.nombre,
      data: props.datos.map((d) => paraEje(saldoDe(d, m.usuarioId))),
      borderColor: colorSerie(i),
      backgroundColor: colorSerie(i)
    }))
  },
  options: opcionesBase()
}))
</script>

<template>
  <figure class="grafico">
    <figcaption>Saldos del grupo</figcaption>
    <div class="lienzo"><canvas ref="canvas" role="img" :aria-label="alternativo"></canvas></div>
    <table class="solo-lectores">
      <caption>Saldo de cada miembro por mes</caption>
      <thead>
        <tr><th scope="col">Mes</th><th v-for="m in miembros" :key="m.usuarioId" scope="col">{{ m.nombre }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="d in datos" :key="d.mes">
          <th scope="row">{{ d.mes }}</th>
          <td v-for="m in miembros" :key="m.usuarioId">{{ formatearMonto(saldoDe(d, m.usuarioId)) }}</td>
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
