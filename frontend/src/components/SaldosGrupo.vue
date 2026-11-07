<script setup>
import { formatearMontoEn } from '../utils/formato.js'

// saldos: [{ usuarioId, nombre, moneda, saldo }] tal como los devuelve la API (no se recalculan).
// Cada moneda tiene su propia fila: nunca se suman dólares con pesos.
const props = defineProps({
  saldos: { type: Array, default: () => [] },
  usuarioId: { type: String, default: null }
})
defineEmits(['registrar-pago'])

const esMio = (s) => props.usuarioId !== null && s.usuarioId === props.usuarioId

function descripcion(s) {
  if (s.saldo.startsWith('-')) {
    return { texto: esMio(s) ? 'debés' : 'debe', monto: formatearMontoEn(s.saldo.slice(1), s.moneda) }
  }
  if (s.saldo === '0.00') return { texto: 'está al día', monto: '' }
  return { texto: esMio(s) ? 'te deben' : 'le deben', monto: formatearMontoEn(s.saldo, s.moneda) }
}
</script>

<template>
  <section class="saldos" aria-label="Saldos del grupo">
    <div class="cabecera">
      <h2>Saldos</h2>
      <button type="button" class="primario" @click="$emit('registrar-pago')">Registrar pago</button>
    </div>
    <p v-if="saldos.length === 0">Todavía no hay saldos.</p>
    <ul class="lista">
      <li v-for="s in saldos" :key="`${s.usuarioId}-${s.moneda}`" data-saldo class="fila">
        <span class="nombre">{{ s.nombre ?? 'Ex miembro' }}</span>
        <span class="texto">{{ descripcion(s).texto }} {{ descripcion(s).monto }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.cabecera { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
h2 { font-size: 1.1rem; margin: 0; }
.primario { padding: 10px 16px; border-radius: 8px; background: var(--primario); color: var(--primario-texto); border: 1px solid var(--primario); font-weight: 600; cursor: pointer; }
.lista { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 8px; }
.fila { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; padding: 10px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; }
.nombre { overflow-wrap: anywhere; min-width: 0; }
.texto { font-weight: 600; }
</style>
