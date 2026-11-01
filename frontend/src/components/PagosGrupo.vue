<script setup>
import CampoMonto from './CampoMonto.vue'
import { ref } from 'vue'
import { formatearMonto, normalizarMonto, hoyLocal } from '../utils/formato.js'

const props = defineProps({
  miembros: { type: Array, default: () => [] }, // [{ usuarioId, nombre }]
  pagos: { type: Array, default: () => [] },
  usuarioId: { type: String, default: null },
  mostrarFormulario: { type: Boolean, default: false }
})
const emit = defineEmits(['registrar'])

const hoy = hoyLocal()
const deudorId = ref(props.usuarioId ?? '')
const acreedorId = ref('')
const monto = ref('')
const fecha = ref(hoy)
const nota = ref('')
const error = ref('')

const nombreDe = (id) => props.miembros.find((m) => m.usuarioId === id)?.nombre ?? 'Ex miembro'

function enviar() {
  const montoNormal = normalizarMonto(monto.value)
  if (!deudorId.value || !acreedorId.value || deudorId.value === acreedorId.value) {
    error.value = 'Elegí quién paga y quién recibe (deben ser personas distintas).'
    return
  }
  if (!montoNormal) {
    error.value = 'Ingresá un monto válido mayor a 0 (hasta 2 decimales).'
    return
  }
  if (!fecha.value) {
    error.value = 'Ingresá una fecha.'
    return
  }
  error.value = ''
  emit('registrar', {
    deudorId: deudorId.value,
    acreedorId: acreedorId.value,
    monto: montoNormal,
    fecha: fecha.value,
    ...(nota.value.trim() ? { nota: nota.value.trim() } : {})
  })
  monto.value = ''
  nota.value = ''
}
</script>

<template>
  <section class="pagos" aria-label="Pagos entre miembros">
    <h2>Pagos</h2>
    <form v-if="mostrarFormulario" class="form-pago" novalidate @submit.prevent="enviar">
      <div v-if="error" class="error-form" role="alert">{{ error }}</div>
      <label>Quién paga
        <select v-model="deudorId" name="deudorId">
          <option value="">Elegí una persona</option>
          <option v-for="m in miembros" :key="m.usuarioId" :value="m.usuarioId">{{ m.nombre }}</option>
        </select>
      </label>
      <label>Quién recibe
        <select v-model="acreedorId" name="acreedorId">
          <option value="">Elegí una persona</option>
          <option v-for="m in miembros" :key="m.usuarioId" :value="m.usuarioId">{{ m.nombre }}</option>
        </select>
      </label>
      <label>Monto <CampoMonto v-model="monto" name="monto" /></label>
      <label>Fecha <input v-model="fecha" name="fecha" type="date" /></label>
      <label>Nota (opcional) <input v-model="nota" name="nota" type="text" maxlength="255" /></label>
      <button type="submit" class="primario">Registrar pago</button>
    </form>

    <p v-if="pagos.length === 0">Todavía no hay pagos registrados.</p>
    <ul class="lista">
      <li v-for="p in pagos" :key="p.id" class="fila">
        <span class="quien">{{ nombreDe(p.deudorId) }} le pagó {{ formatearMonto(p.monto) }} a {{ nombreDe(p.acreedorId) }}</span>
        <span class="fecha">{{ p.fecha.split('-').reverse().join('/') }}</span>
        <span v-if="p.nota" class="nota">{{ p.nota }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
h2 { font-size: 1.1rem; margin: 0 0 12px; }
.form-pago { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; align-items: end; margin-bottom: 16px; }
.form-pago label { display: block; font-size: 0.9rem; color: var(--texto-suave); min-width: 0; }
.form-pago input, .form-pago select {
  display: block; width: 100%; margin-top: 4px; padding: 10px;
  background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px;
}
.error-form { grid-column: 1 / -1; padding: 10px; border-radius: 8px; background: var(--error-fondo); color: var(--error); }
.primario { padding: 10px 16px; border-radius: 8px; background: var(--primario); color: var(--primario-texto); border: 1px solid var(--primario); font-weight: 600; cursor: pointer; }
.lista { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.fila { display: flex; flex-wrap: wrap; gap: 4px 12px; padding: 10px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; }
.quien { overflow-wrap: anywhere; min-width: 0; }
.fecha, .nota { color: var(--texto-suave); font-size: 0.9rem; }
</style>
