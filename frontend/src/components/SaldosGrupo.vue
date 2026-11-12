<script setup>
import { computed } from 'vue'
import { formatearMontoEn } from '../utils/formato.js'
import { comoSaldar } from '../utils/saldar.js'

// saldos: [{ usuarioId, nombre, moneda, saldo }] tal como los devuelve la API (no se recalculan).
// Cada moneda tiene su propia fila: nunca se suman dólares con pesos.
const props = defineProps({
  saldos: { type: Array, default: () => [] },
  usuarioId: { type: String, default: null }
})
defineEmits(['registrar-pago', 'saldar'])

const esMio = (s) => props.usuarioId !== null && s.usuarioId === props.usuarioId
const soyYo = (id) => props.usuarioId !== null && id === props.usuarioId
const nombreDe = (id) => props.saldos.find((s) => s.usuarioId === id)?.nombre ?? 'Ex miembro'

function descripcion(s) {
  if (s.saldo.startsWith('-')) {
    return { texto: esMio(s) ? 'debés' : 'debe', monto: formatearMontoEn(s.saldo.slice(1), s.moneda) }
  }
  if (s.saldo === '0.00') return { texto: 'está al día', monto: '' }
  return { texto: esMio(s) ? 'te deben' : 'le deben', monto: formatearMontoEn(s.saldo, s.moneda) }
}

// Quién le paga a quién para quedar todos al día.
const plan = computed(() => comoSaldar(props.saldos))

// En segunda persona cuando le toca pagar o cobrar a quien mira la pantalla.
function frase(t) {
  const monto = formatearMontoEn(t.monto, t.moneda)
  if (soyYo(t.deudorId)) return `Le pagás ${monto} a ${nombreDe(t.acreedorId)}`
  if (soyYo(t.acreedorId)) return `${nombreDe(t.deudorId)} te paga ${monto}`
  return `${nombreDe(t.deudorId)} le paga ${monto} a ${nombreDe(t.acreedorId)}`
}
function fraseSinCubrir(f) {
  const quien = soyYo(f.usuarioId) ? 'Debés' : `${nombreDe(f.usuarioId)} debe`
  return `${quien} ${formatearMontoEn(f.monto, f.moneda)} de gastos que todavía nadie terminó de pagar.`
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

    <div v-if="saldos.length" class="saldar" data-como-saldar>
      <h3>Para quedar a mano</h3>
      <p v-if="!plan.transferencias.length && !plan.sinCubrir.length" class="suave">Están todos al día.</p>
      <ul v-if="plan.transferencias.length" class="lista">
        <li v-for="(t, i) in plan.transferencias" :key="i" class="fila transferencia" data-transferencia>
          <span class="texto">{{ frase(t) }}</span>
          <button type="button" @click="$emit('saldar', t)">Registrar este pago</button>
        </li>
      </ul>
      <p v-for="f in plan.sinCubrir" :key="`${f.usuarioId}-${f.moneda}`" class="suave sin-cubrir" data-sin-cubrir>{{ fraseSinCubrir(f) }}</p>
    </div>
  </section>
</template>

<style scoped>
.cabecera { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
h2 { font-size: 1.1rem; margin: 0; }
h3 { font-size: 0.95rem; margin: 0; color: var(--texto-suave); }
.primario { padding: 10px 16px; border-radius: 8px; background: var(--primario); color: var(--primario-texto); border: 1px solid var(--primario); font-weight: 600; cursor: pointer; }
.lista { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 8px; }
.fila { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; }
.nombre { overflow-wrap: anywhere; min-width: 0; }
.texto { font-weight: 600; overflow-wrap: anywhere; min-width: 0; }
.saldar { margin-top: 18px; }
.saldar .lista { margin-top: 8px; }
.transferencia { border-left: 4px solid var(--primario); }
.transferencia button { min-height: 38px; padding: 6px 12px; font-size: 0.9rem; }
.suave { color: var(--texto-suave); }
.sin-cubrir { margin: 8px 0 0; font-size: 0.9rem; }
</style>
