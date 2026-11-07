<script setup>
import { ref, onMounted } from 'vue'
import CargandoIndicador from '../components/CargandoIndicador.vue'
import { confirmar } from '../services/dialogo.js'
import { listarCategorias, crearCategoria, editarCategoria, archivarCategoria } from '../services/categorias.js'

const categorias = ref([])
const cargando = ref(false)
const error = ref('')
const aviso = ref('')
const creando = ref(false)
const editandoId = ref(null)
const nombre = ref('')

const esBase = (c) => c.usuarioId === null

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    categorias.value = await listarCategorias()
  } catch (e) {
    error.value = e.mensaje || 'No se pudieron cargar las categorías.'
  } finally {
    cargando.value = false
  }
}

function iniciarCrear() {
  error.value = ''
  aviso.value = ''
  editandoId.value = null
  nombre.value = ''
  creando.value = true
}

function iniciarEditar(c) {
  if (esBase(c)) return
  error.value = ''
  aviso.value = ''
  creando.value = false
  editandoId.value = c.id
  nombre.value = c.nombre
}

function cancelar() {
  creando.value = false
  editandoId.value = null
  nombre.value = ''
}

async function guardar() {
  if (!nombre.value.trim()) {
    error.value = 'Ingresá el nombre de la categoría.'
    return
  }
  error.value = ''
  try {
    if (editandoId.value) {
      await editarCategoria(editandoId.value, { nombre: nombre.value.trim() })
      aviso.value = 'Categoría actualizada.'
    } else {
      await crearCategoria({ nombre: nombre.value.trim() })
      aviso.value = 'Categoría creada.'
    }
    cancelar()
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo guardar la categoría.'
  }
}

async function archivar(c) {
  if (esBase(c)) return
  if (!(await confirmar(`¿Archivar la categoría "${c.nombre}"? Ya no aparecerá en los formularios.`))) return
  error.value = ''
  aviso.value = ''
  try {
    await archivarCategoria(c.id)
    aviso.value = 'Categoría archivada.'
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo archivar la categoría.'
  }
}

onMounted(cargar)
</script>

<template>
  <section>
    <div class="cabecera">
      <div>
        <h1>Categorías</h1>
        <p class="suave">Administrá las categorías para clasificar tus movimientos.</p>
      </div>
      <RouterLink to="/movimientos" class="volver">← Volver a Movimientos</RouterLink>
    </div>

    <div v-if="error" class="error-form" role="alert">{{ error }}</div>
    <div v-if="aviso" class="aviso" role="status">{{ aviso }}</div>

    <div class="acciones-principales">
      <button type="button" class="primario" @click="iniciarCrear">Nueva categoría</button>
    </div>

    <form v-if="creando || editandoId" class="form panel" novalidate @submit.prevent="guardar">
      <h2>{{ editandoId ? 'Editar categoría' : 'Nueva categoría' }}</h2>
      <label>Nombre
        <input v-model="nombre" name="nombre" type="text" maxlength="100" placeholder="Comida, transporte..." />
      </label>
      <div class="acciones">
        <button type="submit" class="primario">Guardar</button>
        <button type="button" @click="cancelar">Cancelar</button>
      </div>
    </form>

    <CargandoIndicador v-if="cargando" variante="esqueleto" />
    <p v-else-if="!categorias.length" class="vacio">Todavía no hay categorías.</p>

    <ul v-else class="lista">
      <li v-for="c in categorias" :key="c.id" class="item panel" data-categoria>
        <div class="info">
          <strong>{{ c.nombre }}</strong>
          <small v-if="esBase(c)" class="suave">Categoría base</small>
        </div>
        <span class="acciones">
          <button v-if="!esBase(c)" type="button" @click="iniciarEditar(c)">Editar</button>
          <button v-if="!esBase(c)" type="button" @click="archivar(c)">Archivar</button>
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
h1 { font-size: 1.5rem; margin: 0; }
h2 { font-size: 1.05rem; margin: 0; grid-column: 1 / -1; }
.cabecera { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.suave { color: var(--texto-suave); margin: 4px 0 0; font-size: 0.9rem; }
.volver { color: var(--primario); text-decoration: none; }
.volver:hover { text-decoration: underline; }
.error-form, .aviso { padding: 10px; margin-bottom: 12px; border-radius: 8px; }
.error-form { background: var(--error-fondo); color: var(--error); }
.aviso { background: var(--superficie); border: 1px solid var(--borde); }
.acciones-principales { margin-bottom: 16px; }
.lista { list-style: none; padding: 0; margin: 16px 0 0; display: grid; gap: 10px; }
.item { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 14px; border: 1px solid var(--borde); border-radius: 10px; }
.info { display: grid; gap: 2px; }
.acciones { display: flex; gap: 8px; flex-wrap: wrap; }
.form { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; align-items: end; margin-bottom: 16px; padding: 14px; border: 1px solid var(--borde); border-radius: 12px; }
.form label { display: block; font-size: 0.9rem; color: var(--texto-suave); }
.form input { display: block; width: 100%; margin-top: 4px; padding: 10px; background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px; }
.form .acciones { grid-column: 1 / -1; }
button { padding: 9px 14px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; }
.primario { background: var(--primario); color: var(--primario-texto); border-color: var(--primario); font-weight: 600; }
.vacio { color: var(--texto-suave); }
@media (max-width: 639px) {
  .cabecera { align-items: stretch; }
  .volver { align-self: flex-start; }
  .acciones-principales button { width: 100%; }
}
</style>
