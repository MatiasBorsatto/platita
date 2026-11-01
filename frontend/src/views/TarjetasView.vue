<script setup>
import { confirmar } from '../services/dialogo.js'
import CargandoIndicador from '../components/CargandoIndicador.vue'
import { ref, onMounted } from 'vue'
import { listarTarjetas, crearTarjeta, eliminarTarjeta } from '../services/tarjetas.js'

const tarjetas = ref([])
const nombre = ref('')
const diaCierre = ref('')
const diaVencimiento = ref('')
const cargando = ref(false)
const error = ref('')

async function cargar() {
  cargando.value = true
  try {
    tarjetas.value = await listarTarjetas()
  } catch (e) {
    error.value = e.mensaje || 'No se pudieron cargar las tarjetas.'
  } finally {
    cargando.value = false
  }
}

const diaValido = (v) => /^\d+$/.test(String(v).trim()) && Number(v) >= 1 && Number(v) <= 31

async function crear() {
  if (!nombre.value.trim()) {
    error.value = 'Ingresá el nombre de la tarjeta.'
    return
  }
  if (!diaValido(diaCierre.value) || !diaValido(diaVencimiento.value)) {
    error.value = 'El día de cierre y el de vencimiento deben estar entre 1 y 31.'
    return
  }
  error.value = ''
  try {
    await crearTarjeta({
      nombre: nombre.value.trim(),
      diaCierre: Number(diaCierre.value),
      diaVencimiento: Number(diaVencimiento.value)
    })
    nombre.value = ''
    diaCierre.value = ''
    diaVencimiento.value = ''
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo crear la tarjeta.'
  }
}

async function eliminar(t) {
  if (!(await confirmar(`¿Eliminar la tarjeta ${t.nombre}?`))) return
  error.value = ''
  try {
    await eliminarTarjeta(t.id)
    await cargar()
  } catch (e) {
    error.value = e.status === 409
      ? 'No se puede eliminar una tarjeta que tiene compras registradas.'
      : e.mensaje || 'No se pudo eliminar la tarjeta.'
  }
}

onMounted(cargar)
</script>

<template>
  <section>
    <h1>Tarjetas</h1>
    <div v-if="error" class="error-form" role="alert">{{ error }}</div>

    <form class="form-tarjeta panel" novalidate @submit.prevent="crear">
      <label>Nombre <input v-model="nombre" name="nombre" type="text" maxlength="60" /></label>
      <label>Día de cierre <input v-model="diaCierre" name="diaCierre" type="number" min="1" max="31" /></label>
      <label>Día de vencimiento <input v-model="diaVencimiento" name="diaVencimiento" type="number" min="1" max="31" /></label>
      <button type="submit" class="primario">Agregar tarjeta</button>
    </form>

    <CargandoIndicador v-if="cargando" variante="esqueleto" />
    <p v-else-if="!tarjetas.length" class="vacio">Todavía no cargaste tarjetas.</p>
    <ul v-else class="lista panel">
      <li v-for="t in tarjetas" :key="t.id" class="item">
        <div>
          <strong>{{ t.nombre }}</strong>
          <small>Cierra el {{ t.diaCierre }} · Vence el {{ t.diaVencimiento }}</small>
        </div>
        <div class="acciones">
          <RouterLink :to="`/tarjetas/${t.id}`" class="boton">Ver detalle</RouterLink>
          <button type="button" @click="eliminar(t)">Eliminar</button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.form-tarjeta { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; align-items: end; margin-bottom: 20px; }
.form-tarjeta label { display: block; font-size: 0.9rem; color: var(--texto-suave); min-width: 0; }
.form-tarjeta input { display: block; width: 100%; margin-top: 4px; padding: 10px; background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px; }
.error-form { padding: 10px; margin-bottom: 12px; border-radius: 8px; background: var(--error-fondo); color: var(--error); }
.lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.item { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center; padding: 12px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 12px; overflow-wrap: anywhere; }
.item small { display: block; color: var(--texto-suave); }
.acciones { display: flex; gap: 8px; }
button, .boton { padding: 10px 16px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; text-decoration: none; font-size: inherit; }
.primario { background: var(--primario); color: var(--primario-texto); border-color: var(--primario); font-weight: 600; }
.vacio { color: var(--texto-suave); }
</style>
