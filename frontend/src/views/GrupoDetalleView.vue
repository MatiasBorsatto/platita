<script setup>
import { confirmar } from '../services/dialogo.js'
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSesion } from '../stores/sesion.js'
import SaldosGrupo from '../components/SaldosGrupo.vue'
import PagosGrupo from '../components/PagosGrupo.vue'
import FormularioGastoCompartido from '../components/FormularioGastoCompartido.vue'
import ListaGastosCompartidos from '../components/ListaGastosCompartidos.vue'
import {
  obtenerGrupo, listarSaldos, listarPagos, registrarPago, crearGastoCompartido,
  listarGastosCompartidos, editarGastoCompartido, eliminarGastoCompartido,
  regenerarCodigo, quitarMiembro, cambiarRol, salirDeGrupo, invitar
} from '../services/grupos.js'
import { listarCategorias } from '../services/movimientos.js'

const route = useRoute()
const router = useRouter()
const sesion = useSesion()
const id = route.params.id

const grupo = ref(null)
const saldos = ref([])
const pagos = ref([])
const categorias = ref([])
const gastos = ref([])
const gastoEnEdicion = ref(null)
const error = ref('')
const aviso = ref('')
const mostrarPago = ref(false)
const emailInvitado = ref('')

const usuarioId = computed(() => sesion.usuario?.id ?? null)
const esAdmin = computed(() => grupo.value?.rol === 'admin')

async function cargarSaldosYPagos() {
  const [s, p] = await Promise.all([listarSaldos(id), listarPagos(id)])
  saldos.value = s
  pagos.value = p
}

async function cargarGastos() {
  const r = await listarGastosCompartidos(id)
  gastos.value = r.items
}

const refrescar = () => Promise.all([cargarSaldosYPagos(), cargarGastos()])

async function cargar() {
  error.value = ''
  try {
    grupo.value = await obtenerGrupo(id)
    await refrescar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo cargar el grupo.'
  }
  try {
    categorias.value = await listarCategorias()
  } catch {
    categorias.value = []
  }
}

async function accion(fn, mensajeError) {
  error.value = ''
  aviso.value = ''
  try {
    await fn()
  } catch (e) {
    error.value = e.mensaje || mensajeError
  }
}

const guardarGasto = (datos) =>
  accion(async () => {
    await crearGastoCompartido(id, datos)
    await refrescar()
    aviso.value = 'Gasto compartido guardado.'
  }, 'No se pudo guardar el gasto.')

const guardarEdicion = (datos) =>
  accion(async () => {
    await editarGastoCompartido(id, gastoEnEdicion.value.id, datos)
    gastoEnEdicion.value = null
    await refrescar()
    aviso.value = 'Gasto compartido actualizado.'
  }, 'No se pudo actualizar el gasto.')

const eliminarGasto = async (g) => {
  if (!(await confirmar(`¿Eliminar el gasto "${g.descripcion || 'sin descripción'}"? Se recalcularán los saldos.`))) return
  return accion(async () => {
    await eliminarGastoCompartido(id, g.id)
    if (gastoEnEdicion.value?.id === g.id) gastoEnEdicion.value = null
    await refrescar()
    aviso.value = 'Gasto compartido eliminado.'
  }, 'No se pudo eliminar el gasto.')
}

const guardarPago = (datos) =>
  accion(async () => {
    await registrarPago(id, datos)
    await cargarSaldosYPagos()
    mostrarPago.value = false
  }, 'No se pudo registrar el pago.')

const regenerar = () =>
  accion(async () => {
    grupo.value = { ...grupo.value, ...(await regenerarCodigo(id)) }
    await recargarMiembros()
  }, 'No se pudo regenerar el código.')

async function recargarMiembros() {
  grupo.value = await obtenerGrupo(id)
}

const quitar = async (m) => {
  if (!(await confirmar(`¿Quitar a ${m.nombre} del grupo?`))) return
  return accion(async () => {
    await quitarMiembro(id, m.usuarioId)
    await recargarMiembros()
    await cargarSaldosYPagos()
  }, 'No se pudo quitar al miembro.')
}

const cambiar = (m, rol) =>
  accion(async () => {
    await cambiarRol(id, m.usuarioId, rol)
    await recargarMiembros()
  }, 'No se pudo cambiar el rol.')

const enviarInvitacion = () => {
  if (!emailInvitado.value.trim()) {
    error.value = 'Ingresá un email para invitar.'
    return
  }
  return accion(async () => {
    await invitar(id, emailInvitado.value.trim())
    aviso.value = 'Invitación enviada.'
    emailInvitado.value = ''
  }, 'No se pudo enviar la invitación.')
}

const salir = async () => {
  if (!(await confirmar('¿Salir de este grupo?'))) return
  return accion(async () => {
    await salirDeGrupo(id)
    await router.push('/grupos')
  }, 'No se pudo salir del grupo.')
}

onMounted(cargar)
</script>

<template>
  <section>
    <h1>{{ grupo?.nombre ?? 'Grupo' }}</h1>
    <div v-if="error" class="error-form" role="alert">{{ error }}</div>
    <div v-if="aviso" class="aviso" role="status">{{ aviso }}</div>

    <template v-if="grupo">
      <div v-if="esAdmin" class="bloque">
        <h2>Invitar</h2>
        <p>Código de invitación: <strong class="codigo">{{ grupo.codigo }}</strong>
          <button type="button" @click="regenerar">Regenerar código</button></p>
        <form class="form-inline panel" novalidate @submit.prevent="enviarInvitacion">
          <label>Email <input v-model="emailInvitado" type="email" autocomplete="off" /></label>
          <button type="submit">Invitar por email</button>
        </form>
      </div>

      <div class="bloque">
        <h2>Miembros</h2>
        <ul class="lista panel">
          <li v-for="m in grupo.miembros" :key="m.usuarioId" class="fila">
            <span class="nombre">{{ m.nombre }} <small>({{ m.rol === 'admin' ? 'administrador' : 'miembro' }})</small></span>
            <span v-if="esAdmin && m.usuarioId !== usuarioId" class="acciones">
              <button v-if="m.rol !== 'admin'" type="button" @click="cambiar(m, 'admin')">Hacer administrador</button>
              <button v-else type="button" @click="cambiar(m, 'miembro')">Quitar administrador</button>
              <button type="button" @click="quitar(m)">Quitar</button>
            </span>
          </li>
        </ul>
        <button type="button" class="salir" @click="salir">Salir del grupo</button>
      </div>

      <div class="bloque">
        <h2>Nuevo gasto compartido</h2>
        <FormularioGastoCompartido
          :miembros="grupo.miembros"
          :usuario-id="usuarioId"
          :categorias="categorias"
          @guardar="guardarGasto"
        />
      </div>

      <div class="bloque">
        <h2>Gastos compartidos</h2>
        <FormularioGastoCompartido
          v-if="gastoEnEdicion"
          :key="gastoEnEdicion.id"
          :miembros="grupo.miembros"
          :usuario-id="usuarioId"
          :categorias="categorias"
          :gasto="gastoEnEdicion"
          @guardar="guardarEdicion"
          @cancelar="gastoEnEdicion = null"
        />
        <ListaGastosCompartidos
          :gastos="gastos"
          :miembros="grupo.miembros"
          :usuario-id="usuarioId"
          @editar="(g) => (gastoEnEdicion = g)"
          @eliminar="eliminarGasto"
        />
      </div>

      <div class="bloque">
        <SaldosGrupo :saldos="saldos" :usuario-id="usuarioId" @registrar-pago="mostrarPago = !mostrarPago" />
      </div>

      <div class="bloque">
        <PagosGrupo
          :miembros="grupo.miembros"
          :pagos="pagos"
          :usuario-id="usuarioId"
          :mostrar-formulario="mostrarPago"
          @registrar="guardarPago"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
h1 { font-size: 1.5rem; margin-top: 0; overflow-wrap: anywhere; }
h2 { font-size: 1.1rem; margin: 0 0 12px; }
.error-form { padding: 10px; margin-bottom: 12px; border-radius: 8px; background: var(--error-fondo); color: var(--error); }
.aviso { padding: 10px; margin-bottom: 12px; border-radius: 8px; background: var(--superficie); border: 1px solid var(--borde); }
.bloque { margin-bottom: 28px; }
.codigo { font-family: monospace; letter-spacing: 0.1em; overflow-wrap: anywhere; }
.form-inline { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; align-items: end; }
.form-inline label { display: block; font-size: 0.9rem; color: var(--texto-suave); min-width: 0; }
.form-inline input {
  display: block; width: 100%; margin-top: 4px; padding: 10px;
  background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px;
}
button { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; }
.lista { list-style: none; padding: 0; margin: 0 0 12px; display: grid; gap: 8px; }
.fila { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; }
.nombre { overflow-wrap: anywhere; min-width: 0; }
.acciones { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
