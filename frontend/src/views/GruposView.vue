<script setup>
import CargandoIndicador from '../components/CargandoIndicador.vue'
import { ref, onMounted } from 'vue'
import { listarGrupos, crearGrupo, unirseAGrupo } from '../services/grupos.js'

const grupos = ref([])
const cargando = ref(false)
const error = ref('')
const nombre = ref('')
const codigo = ref('')

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    grupos.value = await listarGrupos()
  } catch (e) {
    error.value = e.mensaje || 'No se pudieron cargar los grupos.'
  } finally {
    cargando.value = false
  }
}

async function crear() {
  if (!nombre.value.trim()) {
    error.value = 'Ingresá un nombre para el grupo.'
    return
  }
  error.value = ''
  try {
    await crearGrupo(nombre.value.trim())
    nombre.value = ''
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo crear el grupo.'
  }
}

async function unirse() {
  if (!codigo.value.trim()) {
    error.value = 'Ingresá el código de invitación.'
    return
  }
  error.value = ''
  try {
    await unirseAGrupo(codigo.value.trim())
    codigo.value = ''
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo unir al grupo.'
  }
}

onMounted(cargar)
</script>

<template>
  <section>
    <h1>Grupos</h1>
    <div v-if="error" class="error-form" role="alert">{{ error }}</div>

    <form class="form-grid panel" novalidate @submit.prevent="crear">
      <label>Nombre del grupo <input v-model="nombre" type="text" maxlength="100" /></label>
      <button type="submit" class="primario">Crear grupo</button>
    </form>
    <form class="form-grid panel" novalidate @submit.prevent="unirse">
      <label>Código de invitación <input v-model="codigo" type="text" maxlength="16" autocomplete="off" /></label>
      <button type="submit">Unirme</button>
    </form>

    <CargandoIndicador v-if="cargando" variante="esqueleto" />
    <p v-else-if="grupos.length === 0">Todavía no estás en ningún grupo.</p>
    <ul class="lista panel">
      <li v-for="g in grupos" :key="g.id" class="item">
        <RouterLink :to="`/grupos/${g.id}`">{{ g.nombre }}</RouterLink>
        <span class="rol">{{ g.rol === 'admin' ? 'Administrador' : 'Miembro' }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
h1 { font-size: 1.5rem; margin-top: 0; }
.error-form { padding: 10px; margin-bottom: 12px; border-radius: 8px; background: var(--error-fondo); color: var(--error); }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; align-items: end; margin-bottom: 20px; }
.form-grid label { display: block; font-size: 0.9rem; color: var(--texto-suave); min-width: 0; }
.form-grid input {
  display: block; width: 100%; margin-top: 4px; padding: 10px;
  background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px;
}
.form-grid button { padding: 10px 16px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; }
.form-grid .primario { background: var(--primario); color: var(--primario-texto); border-color: var(--primario); font-weight: 600; }
.lista { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.item { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; padding: 12px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; }
.item a { color: var(--texto); font-weight: 600; overflow-wrap: anywhere; min-width: 0; }
.rol { color: var(--texto-suave); font-size: 0.9rem; }
</style>
