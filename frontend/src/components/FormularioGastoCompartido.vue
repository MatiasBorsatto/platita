<script setup>
import CampoMonto from './CampoMonto.vue'
import { ref, computed, watch } from 'vue'
import { formatearMonto, normalizarMonto, aCentavos, deCentavos, hoyLocal } from '../utils/formato.js'

const props = defineProps({
  miembros: { type: Array, required: true }, // [{ usuarioId, nombre }]
  usuarioId: { type: String, default: null },
  categorias: { type: Array, default: () => [] },
  gasto: { type: Object, default: null } // si viene, el formulario edita ese gasto compartido
})
const emit = defineEmits(['guardar', 'cancelar'])
const editando = !!props.gasto

const hoy = hoyLocal()
const g = props.gasto
const pagadorId = ref(g?.pagadorId ?? props.usuarioId ?? props.miembros[0]?.usuarioId ?? '')
const monto = ref(g ? g.monto.replace('.', ',') : '')
const fecha = ref(g?.fecha ?? hoy)
const descripcion = ref(g?.descripcion ?? '')
const categoriaId = ref(g?.categoriaId ?? '')
const personalizados = ref({}) // { [usuarioId]: texto }
const categoriasPart = ref(Object.fromEntries(props.miembros.map((m) => [m.usuarioId, '']))) // { [usuarioId]: categoriaId | '' }

// En edición: si el reparto es el de partes iguales se abre en ese modo; si no, personalizado.
function esPartesIguales(gasto) {
  const n = BigInt(props.miembros.length)
  if (n === 0n || gasto.participaciones.length !== props.miembros.length) return false
  const c = aCentavos(gasto.monto)
  return props.miembros.every((m, i) => {
    const p = gasto.participaciones.find((x) => x.usuarioId === m.usuarioId)
    return p && aCentavos(p.monto) === c / n + (BigInt(i) < c % n ? 1n : 0n)
  })
}
const modo = ref(g && !esPartesIguales(g) ? 'personalizado' : 'igual')
if (g) {
  for (const p of g.participaciones) {
    if (p.usuarioId in categoriasPart.value) {
      // La categoría igual a la del gasto se muestra como "Heredar del gasto".
      categoriasPart.value[p.usuarioId] = p.categoriaId && p.categoriaId !== g.categoriaId ? p.categoriaId : ''
    }
    if (modo.value === 'personalizado') personalizados.value[p.usuarioId] = p.monto.replace('.', ',')
  }
  if (modo.value === 'personalizado') {
    for (const m of props.miembros) personalizados.value[m.usuarioId] ??= ''
  }
}

// Base para todos; las propias solo para el usuario actual (las de otros no son visibles).
const categoriasDe = (uid) =>
  props.categorias.filter((c) => !c.usuarioId || (uid === props.usuarioId && c.usuarioId === props.usuarioId))
const error = ref('')

const total = computed(() => normalizarMonto(monto.value))

// Reparto igual en centavos enteros: los centavos sobrantes van a los primeros miembros.
const igual = computed(() => {
  if (!total.value || props.miembros.length === 0) return {}
  const c = aCentavos(total.value)
  const n = BigInt(props.miembros.length)
  const base = c / n
  const resto = Number(c % n)
  return Object.fromEntries(props.miembros.map((m, i) => [m.usuarioId, deCentavos(base + (i < resto ? 1n : 0n))]))
})

watch(modo, (m) => {
  if (m === 'personalizado') {
    personalizados.value = Object.fromEntries(
      props.miembros.map((p) => [p.usuarioId, (igual.value[p.usuarioId] ?? '').replace('.', ',')])
    )
  }
})

// Montos efectivos por miembro ("0.00" o null si está vacío o es inválido).
const reparto = computed(() => {
  if (modo.value === 'igual') return props.miembros.map((m) => ({ usuarioId: m.usuarioId, monto: igual.value[m.usuarioId] ?? null }))
  return props.miembros.map((m) => ({ usuarioId: m.usuarioId, monto: normalizarMonto(personalizados.value[m.usuarioId]) }))
})

const sumaCentavos = computed(() => reparto.value.reduce((acc, r) => acc + (r.monto ? aCentavos(r.monto) : 0n), 0n))
const sumaCoincide = computed(() => total.value !== null && sumaCentavos.value === aCentavos(total.value))
const puedeEnviar = computed(() => sumaCoincide.value && !!pagadorId.value)

function enviar() {
  if (!total.value) {
    error.value = 'Ingresá un monto válido mayor a 0 (hasta 2 decimales).'
    return
  }
  if (!fecha.value) {
    error.value = 'Ingresá una fecha.'
    return
  }
  if (!sumaCoincide.value) {
    error.value = 'La suma del reparto debe coincidir con el total.'
    return
  }
  error.value = ''
  emit('guardar', {
    pagadorId: pagadorId.value,
    monto: total.value,
    fecha: fecha.value,
    descripcion: descripcion.value.trim() || null,
    categoriaId: categoriaId.value || null,
    participantes: reparto.value.filter((r) => r.monto).map((r) => ({
      usuarioId: r.usuarioId,
      monto: r.monto,
      ...(categoriasPart.value[r.usuarioId] ? { categoriaId: categoriasPart.value[r.usuarioId] } : {})
    }))
  })
}
</script>

<template>
  <form class="form-comp" novalidate @submit.prevent="enviar">
    <div v-if="error" class="error-form" role="alert">{{ error }}</div>
    <label>Monto total
      <CampoMonto v-model="monto" name="monto" />
    </label>
    <label>Fecha
      <input v-model="fecha" name="fecha" type="date" />
    </label>
    <label>Pagó
      <select v-model="pagadorId" name="pagadorId">
        <option v-for="m in miembros" :key="m.usuarioId" :value="m.usuarioId">{{ m.nombre }}</option>
      </select>
    </label>
    <label>Categoría
      <select v-model="categoriaId" name="categoriaId">
        <option value="">Sin categoría</option>
        <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
      </select>
    </label>
    <label>Descripción
      <input v-model="descripcion" name="descripcion" type="text" maxlength="200" />
    </label>
    <label>Reparto
      <select v-model="modo" name="modo">
        <option value="igual">En partes iguales</option>
        <option value="personalizado">Personalizado</option>
      </select>
    </label>

    <ul class="reparto">
      <li v-for="m in miembros" :key="m.usuarioId">
        <span class="nombre">{{ m.nombre }}</span>
        <span v-if="modo === 'igual'" data-reparto>{{ igual[m.usuarioId] ? formatearMonto(igual[m.usuarioId]) : '—' }}</span>
        <CampoMonto
          v-else
          v-model="personalizados[m.usuarioId]"
          :name="`monto-${m.usuarioId}`"
          :aria-label="`Monto de ${m.nombre}`"
        />
        <select v-model="categoriasPart[m.usuarioId]" :name="`categoria-${m.usuarioId}`" :aria-label="`Categoría de ${m.nombre}`">
          <option value="">Heredar del gasto</option>
          <option v-for="c in categoriasDe(m.usuarioId)" :key="c.id" :value="c.id">{{ c.nombre }}</option>
        </select>
      </li>
    </ul>
    <p v-if="modo === 'personalizado' && total && !sumaCoincide" class="aviso" role="status">
      La suma ({{ formatearMonto(deCentavos(sumaCentavos)) }}) no coincide con el total ({{ formatearMonto(total) }}).
    </p>

    <div class="acciones">
      <button type="submit" class="primario" :disabled="!puedeEnviar">{{ editando ? 'Guardar cambios' : 'Guardar gasto compartido' }}</button>
      <button v-if="editando" type="button" data-cancelar @click="emit('cancelar')">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
.form-comp { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; align-items: end; margin-bottom: 20px; }
.form-comp label { display: block; font-size: 0.9rem; color: var(--texto-suave); min-width: 0; }
.form-comp input, .form-comp select {
  display: block; width: 100%; margin-top: 4px; padding: 10px;
  background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px;
}
.error-form { grid-column: 1 / -1; padding: 10px; border-radius: 8px; background: var(--error-fondo); color: var(--error); }
.reparto { grid-column: 1 / -1; list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.reparto li { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.reparto select { max-width: 100%; padding: 8px; background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px; }
.reparto input { width: 140px; margin: 0; }
.nombre { overflow-wrap: anywhere; min-width: 0; }
.aviso { grid-column: 1 / -1; margin: 0; color: var(--error); }
.acciones { grid-column: 1 / -1; display: flex; gap: 8px; flex-wrap: wrap; }
.acciones button:not(.primario) { padding: 10px 16px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; }
.primario { padding: 10px 16px; border-radius: 8px; background: var(--primario); color: var(--primario-texto); border: 1px solid var(--primario); font-weight: 600; cursor: pointer; }
.primario:disabled { opacity: 0.5; cursor: default; }
</style>
