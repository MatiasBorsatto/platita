<script setup>
import { confirmar } from '../services/dialogo.js'
import { ref, reactive, onMounted } from 'vue'
import FormularioMovimiento from '../components/FormularioMovimiento.vue'
import TablaMovimientos from '../components/TablaMovimientos.vue'
import { listarMetas } from '../services/metas.js'
import { listarGrupos, crearGastoCompartido } from '../services/grupos.js'
import { useSesion } from '../stores/sesion.js'
import {
  listarMovimientos, crearMovimiento, editarMovimiento, eliminarMovimiento, listarCategorias
} from '../services/movimientos.js'

const LIMITE = 20
const movimientos = ref([])
const categorias = ref([])
const metas = ref([])
const grupos = ref([])
const sesion = useSesion()
const total = ref(0)
const page = ref(1)
const cargando = ref(false)
const error = ref('')
const editando = ref(null)
const filtros = reactive({ mes: '', tipo: '', categoriaId: '' })

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const r = await listarMovimientos({ ...filtros, page: page.value, limit: LIMITE })
    movimientos.value = r.items
    total.value = r.total
  } catch (e) {
    error.value = e.mensaje || 'No se pudieron cargar los movimientos.'
  } finally {
    cargando.value = false
  }
}

function filtrar() {
  page.value = 1
  cargar()
}
function irA(p) {
  page.value = p
  cargar()
}

async function guardar(datos) {
  error.value = ''
  try {
    if (editando.value) await editarMovimiento(editando.value.id, datos)
    else await crearMovimiento(datos)
    editando.value = null
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo guardar el movimiento.'
  }
}

async function guardarCompartido({ grupoId, datos }) {
  error.value = ''
  try {
    await crearGastoCompartido(grupoId, datos)
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo guardar el gasto compartido.'
  }
}

async function eliminar(mov) {
  if (!(await confirmar('¿Eliminar este movimiento?'))) return
  error.value = ''
  try {
    await eliminarMovimiento(mov.id)
    if (movimientos.value.length === 1 && page.value > 1) page.value -= 1
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo eliminar el movimiento.'
  }
}

onMounted(async () => {
  try {
    categorias.value = await listarCategorias()
  } catch (e) {
    error.value = e.mensaje || 'No se pudieron cargar las categorías.'
  }
  try {
    metas.value = await listarMetas()
  } catch {
    metas.value = []
  }
  try {
    grupos.value = await listarGrupos()
  } catch {
    grupos.value = []
  }
  await cargar()
})
</script>

<template>
  <section>
    <h1>Movimientos</h1>
    <div v-if="error" class="error-form" role="alert">{{ error }}</div>

    <FormularioMovimiento
      :key="editando?.id ?? 'nuevo'"
      :categorias="categorias"
      :metas="metas"
      :movimiento="editando"
      :grupos="grupos"
      :usuario-id="sesion.usuario?.id ?? null"
      @guardar="guardar"
      @guardar-compartido="guardarCompartido"
      @cancelar="editando = null"
    />

    <form class="filtros panel" @submit.prevent="filtrar">
      <label>Mes <input v-model="filtros.mes" type="month" @change="filtrar" /></label>
      <label>Tipo
        <select v-model="filtros.tipo" @change="filtrar">
          <option value="">Todos</option>
          <option value="ingreso">Ingreso</option>
          <option value="gasto">Gasto</option>
        </select>
      </label>
      <label>Categoría
        <select v-model="filtros.categoriaId" @change="filtrar">
          <option value="">Todas</option>
          <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
        </select>
      </label>
    </form>

    <CargandoIndicador v-if="cargando" variante="esqueleto" />
    <TablaMovimientos :movimientos="movimientos" :categorias="categorias" @editar="editando = $event" @eliminar="eliminar" />

    <div v-if="total > LIMITE" class="paginas">
      <button type="button" :disabled="page <= 1" @click="irA(page - 1)">Anterior</button>
      <span>Página {{ page }} de {{ Math.ceil(total / LIMITE) }}</span>
      <button type="button" :disabled="page * LIMITE >= total" @click="irA(page + 1)">Siguiente</button>
    </div>
  </section>
</template>

<style scoped>
h1 { font-size: 1.5rem; margin-top: 0; }
.error-form { padding: 10px; margin-bottom: 12px; border-radius: 8px; background: var(--error-fondo); color: var(--error); }
.filtros { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
.filtros label { font-size: 0.9rem; color: var(--texto-suave); min-width: 0; }
.filtros input, .filtros select {
  display: block; width: 100%; margin-top: 4px; padding: 8px;
  background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px;
}
.paginas { display: flex; gap: 12px; align-items: center; justify-content: center; margin-top: 16px; flex-wrap: wrap; }
.paginas button { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; }
.paginas button:disabled { opacity: 0.5; cursor: default; }
</style>
