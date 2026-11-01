<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { formatearMonto } from '../utils/formato.js'
import { contar } from '../motion/movimiento.js'

// Muestra un monto que sube desde cero hasta su valor. El valor real siempre viene de la API.
const props = defineProps({
  valor: { type: String, required: true }
})

const mostrado = ref(0)
let control = null

function animar(valor) {
  control?.stop()
  control = contar(Number(valor), (v) => {
    mostrado.value = v
  })
}

onMounted(() => animar(props.valor))
watch(() => props.valor, animar)
onBeforeUnmount(() => control?.stop())
</script>

<template>
  <span>{{ formatearMonto(mostrado.toFixed(2)) }}</span>
</template>
