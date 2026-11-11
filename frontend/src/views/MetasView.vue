<script setup>
import CampoMonto from '../components/CampoMonto.vue'
import { confirmar } from '../services/dialogo.js'
import CargandoIndicador from '../components/CargandoIndicador.vue'
import { ref, computed, onMounted } from 'vue'
import BarraMeta from '../components/BarraMeta.vue'
import { listarMetasPagina, crearMeta, eliminarMeta, registrarAporte } from '../services/metas.js'
import { normalizarMonto, hoyLocal } from '../utils/formato.js'
import { MONEDAS } from '../utils/gastoFijo.js'

const hoy = hoyLocal()
const metas = ref([])
const cargando = ref(false)
const error = ref('')

const nombre = ref('')
const objetivo = ref('')
const moneda = ref('ARS')
const fechaLimite = ref('')

// Estado del formulario de aporte por meta: { [id]: { tipo, monto, fecha } }
const aportes = ref({})
const formAporte = (id) => (aportes.value[id] ??= { tipo: 'aporte', monto: '', fecha: hoy })

const pagina = ref(1)
const total = ref(0)
const hayMas = computed(() => metas.value.length < total.value)

async function cargar() {
  cargando.value = true
  error.value = ''
  pagina.value = 1
  try {
    const datos = await listarMetasPagina(1)
    metas.value = datos.items
    total.value = datos.total
  } catch (e) {
    error.value = e.mensaje || 'No se pudieron cargar las metas.'
  } finally {
    cargando.value = false
  }
}

async function cargarMas() {
  pagina.value += 1
  try {
    const datos = await listarMetasPagina(pagina.value)
    metas.value = [...metas.value, ...datos.items]
  } catch (e) {
    error.value = e.mensaje || 'No se pudieron cargar más metas.'
  }
}

async function crear() {
  const montoObjetivo = normalizarMonto(objetivo.value)
  if (!nombre.value.trim()) {
    error.value = 'Ingresá un nombre para la meta.'
    return
  }
  if (!montoObjetivo) {
    error.value = 'Ingresá un objetivo válido mayor a 0 (hasta 2 decimales).'
    return
  }
  error.value = ''
  try {
    await crearMeta({
      nombre: nombre.value.trim(),
      montoObjetivo,
      moneda: moneda.value,
      ...(fechaLimite.value ? { fechaLimite: fechaLimite.value } : {})
    })
    nombre.value = ''
    objetivo.value = ''
    moneda.value = 'ARS'
    fechaLimite.value = ''
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo crear la meta.'
  }
}

async function aportar(meta) {
  const f = formAporte(meta.id)
  const monto = normalizarMonto(f.monto)
  if (!monto) {
    error.value = 'Ingresá un monto válido mayor a 0 (hasta 2 decimales).'
    return
  }
  if (!f.fecha) {
    error.value = 'Ingresá una fecha.'
    return
  }
  error.value = ''
  try {
    const r = await registrarAporte(meta.id, {
      monto: f.tipo === 'retiro' ? `-${monto}` : monto,
      fecha: f.fecha
    })
    const i = metas.value.findIndex((m) => m.id === meta.id)
    if (i !== -1) metas.value[i] = r.meta
    f.monto = ''
  } catch (e) {
    error.value = e.mensaje || 'No se pudo registrar el aporte.'
  }
}

async function eliminar(meta) {
  if (!(await confirmar('¿Eliminar esta meta y sus aportes?'))) return
  error.value = ''
  try {
    await eliminarMeta(meta.id)
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo eliminar la meta.'
  }
}

onMounted(cargar)
</script>

<template>
  <section>
    <h1>Metas</h1>
    <p class="intro-modulo">Juntá plata para algo que quieras: un viaje, un arreglo o un fondo de emergencia. Cada aporte acerca la barra al objetivo.</p>
    <div v-if="error" class="error-form" role="alert">{{ error }}</div>

    <form class="form-grid panel" novalidate data-tour="nueva-meta" @submit.prevent="crear">
      <h2>Nueva meta</h2>
      <label>Nombre <input v-model="nombre" type="text" maxlength="100" /></label>
      <label>Objetivo <CampoMonto v-model="objetivo" /></label>
      <label>Moneda
        <select v-model="moneda" name="moneda">
          <option v-for="m in MONEDAS" :key="m" :value="m">{{ m }}</option>
        </select>
      </label>
      <label>Fecha límite (opcional) <input v-model="fechaLimite" type="date" /></label>
      <button type="submit" class="primario">Crear meta</button>
    </form>

    <CargandoIndicador v-if="cargando" variante="esqueleto" />
    <p v-else-if="metas.length === 0">Todavía no tenés metas.</p>
    <ul class="lista panel">
      <li v-for="m in metas" :key="m.id" class="item">
        <div class="cabecera">
          <h2>{{ m.nombre }} <span class="moneda">{{ m.moneda }}</span></h2>
          <button type="button" @click="eliminar(m)">Eliminar</button>
        </div>
        <p v-if="m.fechaLimite" class="limite">Fecha límite: {{ m.fechaLimite.split('-').reverse().join('/') }}</p>
        <BarraMeta :monto-objetivo="m.montoObjetivo" :acumulado="m.acumulado" :porcentaje="m.porcentaje" :restante="m.restante" :moneda="m.moneda" />
        <form class="form-grid aporte" novalidate @submit.prevent="aportar(m)">
          <label>Operación
            <select v-model="formAporte(m.id).tipo">
              <option value="aporte">Aporte</option>
              <option value="retiro">Retiro</option>
            </select>
          </label>
          <label>Monto en {{ m.moneda }} <CampoMonto v-model="formAporte(m.id).monto" /></label>
          <label>Fecha <input v-model="formAporte(m.id).fecha" type="date" /></label>
          <button type="submit">Registrar</button>
        </form>
      </li>
    </ul>
    <button v-if="hayMas" type="button" class="cargar-mas" @click="cargarMas">Cargar más metas</button>
  </section>
</template>

<style scoped>
h1 { font-size: 1.5rem; margin-top: 0; }
.error-form { padding: 10px; margin-bottom: 12px; border-radius: 8px; background: var(--error-fondo); color: var(--error); }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; align-items: end; margin-bottom: 20px; }
.form-grid.aporte { margin: 12px 0 0; }
.form-grid label { display: block; font-size: 0.9rem; color: var(--texto-suave); min-width: 0; }
.form-grid input, .form-grid select {
  display: block; width: 100%; margin-top: 4px; padding: 10px;
  background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px;
}
.form-grid button, .cabecera button { padding: 10px 16px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; }
.form-grid .primario { background: var(--primario); color: var(--primario-texto); border-color: var(--primario); font-weight: 600; }
.lista { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.item { padding: 12px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; }
.cabecera { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
.cabecera h2 { font-size: 1.1rem; margin: 0; min-width: 0; overflow-wrap: anywhere; }
.limite { margin: 0 0 8px; font-size: 0.9rem; color: var(--texto-suave); }
.moneda { font-size: 0.75rem; font-weight: 600; color: var(--texto-suave); border: 1px solid var(--borde); border-radius: 999px; padding: 1px 8px; vertical-align: middle; }
</style>
