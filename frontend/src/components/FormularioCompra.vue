<script setup>
import CampoMonto from './CampoMonto.vue'
import { ref } from 'vue'
import { normalizarMonto, hoyLocal } from '../utils/formato.js'

defineProps({
  categorias: { type: Array, default: () => [] }
})
const emit = defineEmits(['guardar', 'cancelar'])

const hoy = hoyLocal()
const montoTotal = ref('')
const cuotas = ref('1')
const modalidad = ref('por_cuota')
const fecha = ref(hoy)
const categoriaId = ref('')
const descripcion = ref('')
const error = ref('')

function enviar() {
  const monto = normalizarMonto(montoTotal.value)
  if (!monto) {
    error.value = 'Ingresá un monto total válido mayor a 0 (hasta 2 decimales).'
    return
  }
  const n = Number(cuotas.value)
  if (!/^\d+$/.test(String(cuotas.value).trim()) || n < 1 || n > 60) {
    error.value = 'Las cuotas deben ser un número entero entre 1 y 60.'
    return
  }
  if (!fecha.value) {
    error.value = 'Ingresá una fecha.'
    return
  }
  error.value = ''
  emit('guardar', {
    montoTotal: monto,
    cuotas: n,
    modalidad: modalidad.value,
    fecha: fecha.value,
    categoriaId: categoriaId.value || null,
    descripcion: descripcion.value.trim() || null
  })
}
</script>

<template>
  <form class="form-compra" novalidate @submit.prevent="enviar">
    <div v-if="error" class="error-form" role="alert">{{ error }}</div>
    <label>Monto total
      <CampoMonto v-model="montoTotal" name="montoTotal" />
    </label>
    <label>Cuotas
      <input v-model="cuotas" name="cuotas" type="number" min="1" max="60" step="1" />
    </label>
    <label>Fecha de compra
      <input v-model="fecha" name="fecha" type="date" />
    </label>
    <label>Categoría
      <select v-model="categoriaId" name="categoriaId">
        <option value="">Sin categoría</option>
        <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
      </select>
    </label>
    <label class="ancho">Descripción
      <input v-model="descripcion" name="descripcion" type="text" maxlength="255" />
    </label>
    <fieldset class="ancho modalidades">
      <legend>Modalidad</legend>
      <label class="opcion">
        <input v-model="modalidad" type="radio" name="modalidad" value="por_cuota" />
        <span><strong>Contar cada cuota en su mes</strong>
          <small>Se genera un gasto por cada cuota, en el resumen que le corresponde.</small></span>
      </label>
      <label class="opcion">
        <input v-model="modalidad" type="radio" name="modalidad" value="compra_completa" />
        <span><strong>Registrar la compra completa</strong>
          <small>Se registra un único gasto por el total; las cuotas restantes se informan como futuras.</small></span>
      </label>
    </fieldset>
    <div class="acciones">
      <button type="submit" class="primario">Registrar compra</button>
      <button type="button" @click="emit('cancelar')">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
.form-compra { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; align-items: end; margin-bottom: 20px; }
.form-compra label { display: block; font-size: 0.9rem; color: var(--texto-suave); min-width: 0; }
.form-compra input:not([type="radio"]), .form-compra select {
  display: block; width: 100%; margin-top: 4px; padding: 10px;
  background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px;
}
.ancho, .error-form { grid-column: 1 / -1; }
.error-form { padding: 10px; border-radius: 8px; background: var(--error-fondo); color: var(--error); }
.modalidades { border: 1px solid var(--borde); border-radius: 8px; padding: 10px; display: grid; gap: 8px; min-width: 0; }
.opcion { display: flex; gap: 10px; align-items: flex-start; color: var(--texto); }
.opcion span { display: grid; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
.opcion small { color: var(--texto-suave); }
.acciones { display: flex; gap: 8px; }
.acciones button { padding: 10px 16px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; }
.acciones .primario { background: var(--primario); color: var(--primario-texto); border-color: var(--primario); font-weight: 600; }
</style>
