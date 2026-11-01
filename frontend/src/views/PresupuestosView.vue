<script setup>
import CampoMonto from '../components/CampoMonto.vue'
import { confirmar } from '../services/dialogo.js'
import CargandoIndicador from '../components/CargandoIndicador.vue'
import { ref, onMounted } from 'vue'
import BarraPresupuesto from '../components/BarraPresupuesto.vue'
import { listarCategorias } from '../services/movimientos.js'
import { estadoPresupuestos, guardarPresupuesto, eliminarPresupuesto } from '../services/presupuestos.js'
import { normalizarMonto } from '../utils/formato.js'

const ahora = new Date()
const mes = ref(`${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`)
const estados = ref([])
const categorias = ref([])
const categoriaId = ref('')
const monto = ref('')
const cargando = ref(false)
const error = ref('')

const nombreCategoria = (id) => categorias.value.find((c) => c.id === id)?.nombre ?? 'Sin categoría'

async function cargar() {
  if (!mes.value) return
  cargando.value = true
  error.value = ''
  try {
    estados.value = await estadoPresupuestos(mes.value)
  } catch (e) {
    error.value = e.mensaje || 'No se pudieron cargar los presupuestos.'
  } finally {
    cargando.value = false
  }
}

async function guardar() {
  const montoLimite = normalizarMonto(monto.value)
  if (!categoriaId.value) {
    error.value = 'Elegí una categoría.'
    return
  }
  if (!montoLimite) {
    error.value = 'Ingresá un monto válido mayor a 0 (hasta 2 decimales).'
    return
  }
  error.value = ''
  try {
    await guardarPresupuesto({ categoriaId: categoriaId.value, mes: mes.value, montoLimite })
    monto.value = ''
    categoriaId.value = ''
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo guardar el presupuesto.'
  }
}

async function eliminar(p) {
  if (!(await confirmar('¿Eliminar este presupuesto?'))) return
  error.value = ''
  try {
    await eliminarPresupuesto(p.id)
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo eliminar el presupuesto.'
  }
}

onMounted(async () => {
  try {
    categorias.value = await listarCategorias()
  } catch (e) {
    error.value = e.mensaje || 'No se pudieron cargar las categorías.'
  }
  await cargar()
})
</script>

<template>
  <section>
    <h1>Presupuestos</h1>
    <div v-if="error" class="error-form" role="alert">{{ error }}</div>

    <form class="form-pres panel" novalidate @submit.prevent="guardar">
      <label>Mes <input v-model="mes" type="month" @change="cargar" /></label>
      <label>Categoría
        <select v-model="categoriaId">
          <option value="">Elegí una categoría</option>
          <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
        </select>
      </label>
      <label>Límite mensual
        <CampoMonto v-model="monto" />
      </label>
      <button type="submit" class="primario">Guardar presupuesto</button>
    </form>

    <CargandoIndicador v-if="cargando" variante="esqueleto" />
    <p v-else-if="estados.length === 0">No hay presupuestos para este mes.</p>
    <ul class="lista panel">
      <li v-for="p in estados" :key="p.id" class="item">
        <div class="cabecera">
          <h2>{{ nombreCategoria(p.categoriaId) }}</h2>
          <button type="button" @click="eliminar(p)">Eliminar</button>
        </div>
        <BarraPresupuesto :monto-limite="p.montoLimite" :consumido="p.consumido" :restante="p.restante" :porcentaje="p.porcentaje" :alerta="p.alerta" />
      </li>
    </ul>
  </section>
</template>

<style scoped>
h1 { font-size: 1.5rem; margin-top: 0; }
.error-form { padding: 10px; margin-bottom: 12px; border-radius: 8px; background: var(--error-fondo); color: var(--error); }
.form-pres { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; align-items: end; margin-bottom: 20px; }
.form-pres label { display: block; font-size: 0.9rem; color: var(--texto-suave); min-width: 0; }
.form-pres input, .form-pres select {
  display: block; width: 100%; margin-top: 4px; padding: 10px;
  background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px;
}
.form-pres button, .cabecera button { padding: 10px 16px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; }
.form-pres .primario { background: var(--primario); color: var(--primario-texto); border-color: var(--primario); font-weight: 600; }
.lista { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.item { padding: 12px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; }
.cabecera { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
.cabecera h2 { font-size: 1.1rem; margin: 0; min-width: 0; overflow-wrap: anywhere; }
</style>
