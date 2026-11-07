<script setup>
import { onMounted, ref } from 'vue'
import { listarMenores, vincularMenor, cambiarPermisos, desvincularMenor, actividadDelMenor } from '../services/controlParental.js'
import { listarGrupos } from '../services/grupos.js'
import { confirmar } from '../services/dialogo.js'
import { agruparPermisos, etiquetaDePermiso } from '../utils/controlParental.js'
import CargandoIndicador from '../components/CargandoIndicador.vue'

const menores = ref([])
const grupos = ref([])
const cargando = ref(false)
const error = ref('')
const aviso = ref('')
const emailNuevo = ref('')
const grupoNuevo = ref('')
const actividad = ref({})

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    menores.value = await listarMenores()
    grupos.value = await listarGrupos()
    if (!grupoNuevo.value && grupos.value.length) grupoNuevo.value = grupos.value[0].id
  } catch (e) {
    error.value = e.mensaje || 'No se pudo cargar el control parental.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

async function agregar() {
  error.value = ''
  aviso.value = ''
  if (!grupoNuevo.value || !emailNuevo.value.trim()) {
    error.value = 'Elegí el grupo e ingresá el email del menor.'
    return
  }
  try {
    await vincularMenor(grupoNuevo.value, emailNuevo.value.trim())
    emailNuevo.value = ''
    aviso.value = 'Menor vinculado. Ahora elegí qué puede hacer.'
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo vincular al menor.'
  }
}

// Cambia un interruptor: se aplica al instante y el backend registra el cambio en la auditoría.
async function alternar(menor, permiso, valor) {
  error.value = ''
  try {
    const actualizado = await cambiarPermisos(menor.menor.id, menor.grupoId, { [permiso]: valor })
    Object.assign(menor, actualizado)
  } catch (e) {
    const mensaje = e.mensaje || 'No se pudo cambiar el permiso.'
    // cargar() limpia el error, así que se muestra después de recargar.
    await cargar()
    error.value = mensaje
  }
}

async function quitar(menor) {
  if (!(await confirmar(`¿Desvincular a ${menor.menor.nombre}? Pierde los permisos que le diste.`))) return
  try {
    await desvincularMenor(menor.menor.id, menor.grupoId)
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo desvincular.'
  }
}

async function verActividad(menor) {
  actividad.value = { ...actividad.value, [menor.menor.id]: await actividadDelMenor(menor.menor.id) }
}

const textoAccion = (a) => {
  if (a.accion === 'permiso.concedido') return 'Concedido'
  if (a.accion === 'permiso.retirado') return 'Retirado'
  return a.accion
}
</script>

<template>
  <section>
    <h1>Control parental</h1>
    <p class="suave">Elegí qué puede hacer cada menor de tu grupo. Los cambios se aplican al instante y quedan registrados.</p>
    <p v-if="error" class="error-form" role="alert">{{ error }}</p>
    <div v-if="aviso" class="aviso" role="status">{{ aviso }}</div>

    <section class="panel agregar" aria-labelledby="titulo-agregar">
      <h2 id="titulo-agregar">Vincular un menor</h2>
      <label>Grupo
        <select v-model="grupoNuevo">
          <option v-for="g in grupos" :key="g.id" :value="g.id">{{ g.nombre }}</option>
        </select>
      </label>
      <label>Email del menor
        <input v-model="emailNuevo" type="email" autocomplete="off" />
      </label>
      <button type="button" class="primario" @click="agregar">Vincular</button>
    </section>

    <CargandoIndicador v-if="cargando" variante="esqueleto" />
    <p v-else-if="!menores.length" class="vacio">Todavía no vinculaste a ningún menor.</p>

    <article v-for="m in menores" :key="m.vinculoId" class="panel menor" :aria-labelledby="`menor-${m.vinculoId}`">
      <header class="cabecera">
        <h2 :id="`menor-${m.vinculoId}`">{{ m.menor.nombre }}</h2>
        <span class="etiqueta">{{ m.menor.edad !== null ? `${m.menor.edad} años` : 'Sin fecha' }}</span>
        <button type="button" @click="quitar(m)">Desvincular</button>
      </header>

      <div v-for="grupo in agruparPermisos(m.permisos)" :key="grupo.clave" class="categoria">
        <h3>{{ grupo.titulo }}</h3>
        <label
          v-for="p in grupo.items"
          :key="p.permiso"
          class="interruptor"
          :class="{ bloqueado: p.bloqueadoPorPolitica }"
        >
          <span>{{ etiquetaDePermiso(p.permiso) }}</span>
          <input
            type="checkbox"
            role="switch"
            :checked="p.permitido"
            :disabled="p.bloqueadoPorPolitica"
            @change="alternar(m, p.permiso, $event.target.checked)"
          />
          <small v-if="p.bloqueadoPorPolitica">Siempre bloqueado para menores</small>
        </label>
      </div>

      <details @toggle="verActividad(m)">
        <summary>Actividad</summary>
        <ul v-if="actividad[m.menor.id]?.length" class="actividad">
          <li v-for="(a, i) in actividad[m.menor.id]" :key="i">
            {{ textoAccion(a) }}: {{ a.detalle?.permiso ? etiquetaDePermiso(a.detalle.permiso) : '' }}
          </li>
        </ul>
        <p v-else class="suave">Sin cambios registrados.</p>
      </details>
    </article>
  </section>
</template>

<style scoped>
h1 { font-size: 1.5rem; margin-top: 0; }
h2 { font-size: 1.1rem; margin: 0; }
h3 { font-size: 0.95rem; margin: 12px 0 6px; color: var(--texto-suave); }
.suave { color: var(--texto-suave); }
.agregar, .menor { display: grid; gap: 12px; margin-bottom: 16px; }
.cabecera { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.cabecera h2 { margin-right: auto; }
.etiqueta { color: var(--texto-suave); font-size: 0.9rem; }
.interruptor { display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; align-items: center; padding: 10px 12px; border: 1px solid var(--borde); border-radius: var(--radio-chico); margin-bottom: 6px; cursor: pointer; }
.interruptor small { grid-column: 1 / -1; color: var(--texto-suave); }
.interruptor.bloqueado { opacity: 0.6; cursor: not-allowed; }
.interruptor input { width: 40px; height: 22px; accent-color: var(--primario); }
.actividad { margin: 8px 0 0; padding-left: 18px; }
/* El bloque de vinculación no es un <form>: mismas reglas de campos que el resto de los formularios. */
.agregar label { display: grid; gap: 6px; font-size: 0.875rem; font-weight: 600; color: var(--texto-suave); min-width: 0; }
.agregar input, .agregar select { width: 100%; min-height: 44px; padding: 10px 12px; font-size: 0.95rem; font-weight: 400; color: var(--texto); }
.agregar button { justify-self: end; min-width: 160px; }
</style>
