<script setup>
import { confirmar } from '../services/dialogo.js'
import { ref, reactive, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import FormularioMovimiento from '../components/FormularioMovimiento.vue'
import TablaMovimientos from '../components/TablaMovimientos.vue'
import CargandoIndicador from '../components/CargandoIndicador.vue'
import { listarMetas } from '../services/metas.js'
import { listarGrupos, crearGastoCompartido } from '../services/grupos.js'
import { useSesion } from '../stores/sesion.js'
import {
  listarMovimientos, crearMovimiento, editarMovimiento, eliminarMovimiento,
  listarCategorias, dineroActual
} from '../services/movimientos.js'
import { listarRecordatorios, pagarCuota } from '../services/gastos-fijos.js'
import { formatearMonto, formatearMontoEn } from '../utils/formato.js'

const LIMITE = 20
const movimientos = ref([])
const categorias = ref([])
const metas = ref([])
const grupos = ref([])
const sesion = useSesion()
const total = ref(0)
const page = ref(1)
const cargando = ref(false)
const cargandoDatos = ref(false)
const error = ref('')
const aviso = ref('')
const editando = ref(null)
// Cambia después de cada alta exitosa: el formulario se vuelve a montar vacío para cargar otro.
const versionFormulario = ref(0)
const filtros = reactive({ mes: '', tipo: '', categoriaId: '' })

const dinero = ref(null)
const recordatorios = ref([])
const cargandoRecordatorios = ref(false)

function formatear(d) {
  return formatearMonto(d ?? '0.00')
}

async function cargarMiPlata() {
  try {
    dinero.value = await dineroActual()
  } catch {
    dinero.value = null
  }
}

async function cargarRecordatorios() {
  cargandoRecordatorios.value = true
  try {
    recordatorios.value = await listarRecordatorios()
  } catch {
    recordatorios.value = []
  } finally {
    cargandoRecordatorios.value = false
  }
}

async function pagarRecordatorio(r) {
  error.value = ''
  aviso.value = ''
  try {
    await pagarCuota(r.gastoFijoId, r.id, {})
    aviso.value = 'Pago registrado. El gasto ya aparece en Movimientos.'
    await cargarRecordatorios()
    await cargarMiPlata()
    await cargar()
    window.dispatchEvent(new Event('notificaciones:cambio'))
  } catch (e) {
    error.value = e.mensaje || 'No se pudo registrar el pago.'
  }
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const res = await listarMovimientos({ ...filtros, page: page.value, limit: LIMITE })
    movimientos.value = res.items || res
    total.value = res.total ?? movimientos.value.length
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
  aviso.value = ''
  try {
    if (editando.value) await editarMovimiento(editando.value.id, datos)
    else await crearMovimiento(datos)
    editando.value = null
    versionFormulario.value++
    await cargarMiPlata()
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo guardar el movimiento.'
  }
}

async function guardarCompartido({ grupoId, datos }) {
  error.value = ''
  aviso.value = ''
  try {
    await crearGastoCompartido(grupoId, datos)
    versionFormulario.value++
    await cargarMiPlata()
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo guardar el gasto compartido.'
  }
}

async function eliminar(mov) {
  if (mov.gastoFijoId) {
    error.value = 'Este movimiento proviene de un gasto fijo. Se gestiona desde Gastos fijos.'
    return
  }
  if (!(await confirmar('¿Eliminar este movimiento?'))) return
  error.value = ''
  aviso.value = ''
  try {
    await eliminarMovimiento(mov.id)
    if (movimientos.value.length === 1 && page.value > 1) page.value -= 1
    await cargarMiPlata()
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo eliminar el movimiento.'
  }
}

onMounted(async () => {
  cargandoDatos.value = true
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
  await Promise.all([cargarMiPlata(), cargarRecordatorios(), cargar()])
  cargandoDatos.value = false
})
</script>

<template>
  <section>
    <div class="cabecera">
      <div>
        <h1>Movimientos</h1>
        <p class="suave">Controlá tu plata, vencimientos y movimientos del día a día.</p>
      </div>
      <RouterLink to="/categorias" class="link" data-tour="link-categorias">Administrar categorías</RouterLink>
    </div>

    <div v-if="error" class="error-form" role="alert">{{ error }}</div>
    <div v-if="aviso" class="aviso" role="status">{{ aviso }}</div>

    <section class="bloque" data-tour="mi-plata">
      <h2>Mi plata</h2>
      <div v-if="dinero" class="mi-plata panel">
        <div class="total">
          <span>Dinero actual</span>
          <strong>{{ formatear(dinero.dineroActual) }}</strong>
        </div>
        <div class="detalle">
          <span>Ingresos: <strong>{{ formatear(dinero.ingresos) }}</strong></span>
          <span>Gastos personales: <strong>{{ formatear(dinero.gastosPersonales) }}</strong></span>
          <span>Aportes a gastos compartidos: <strong>{{ formatear(dinero.gastosCompartidos) }}</strong></span>
        </div>
        <div v-for="m in (dinero.porMoneda ?? []).filter((x) => x.moneda !== 'ARS')" :key="m.moneda" class="detalle" data-otra-moneda>
          <span>{{ m.moneda }}: <strong>{{ formatearMontoEn(m.dineroActual, m.moneda) }}</strong></span>
          <span>Ingresos: <strong>{{ formatearMontoEn(m.ingresos, m.moneda) }}</strong></span>
          <span>Gastos: <strong>{{ formatearMontoEn(m.gastos, m.moneda) }}</strong></span>
        </div>
        <small class="suave">Fecha de corte: {{ dinero.fechaCorte }}</small>
      </div>
      <p v-else class="suave">No pudimos calcular "Mi plata".</p>
    </section>

    <section class="bloque">
      <h2>Tenemos que pagar</h2>
      <CargandoIndicador v-if="cargandoRecordatorios" />
      <p v-else-if="!recordatorios.length" class="suave">No hay vencimientos próximos ni vencidos.</p>
      <ul v-else class="lista-recordatorios">
        <li v-for="r in recordatorios" :key="r.id" class="recordatorio panel" data-recordatorio>
          <div class="info">
            <strong>{{ r.gastoNombre }} - {{ r.conceptoNombre }}</strong>
            <small class="suave">
              Vence {{ r.fechaVencimiento }} · {{ formatear(r.monto) }}
              <span v-if="r.situacion === 'vencido'">· Vencido</span>
              <span v-else>· Vence pronto</span>
            </small>
          </div>
          <button type="button" class="primario" @click="pagarRecordatorio(r)">Pagar</button>
        </li>
      </ul>
    </section>

    <section class="bloque" data-tour="cargar-movimiento">
      <h2>Cargar movimiento</h2>
      <FormularioMovimiento
        :key="editando?.id ?? `nuevo-${versionFormulario}`"
        :categorias="categorias"
        :metas="metas"
        :movimiento="editando"
        :grupos="grupos"
        :usuario-id="sesion.usuario?.id ?? null"
        @guardar="guardar"
        @guardar-compartido="guardarCompartido"
        @cancelar="editando = null"
      />
    </section>

    <section class="bloque" data-tour="lista-movimientos">
      <h2>Movimientos</h2>
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
      <TablaMovimientos :movimientos="movimientos" :categorias="categorias" @editar="(m) => m.gastoFijoId ? null : (editando = m)" @eliminar="eliminar" />

      <div v-if="total > LIMITE" class="paginas">
        <button type="button" :disabled="page <= 1" @click="irA(page - 1)">Anterior</button>
        <span>Página {{ page }} de {{ Math.ceil(total / LIMITE) }}</span>
        <button type="button" :disabled="page * LIMITE >= total" @click="irA(page + 1)">Siguiente</button>
      </div>
    </section>
  </section>
</template>

<style scoped>
h1 { font-size: 1.5rem; margin: 0; }
h2 { font-size: 1.2rem; margin: 0 0 12px; }
.cabecera { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
.suave { color: var(--texto-suave); margin: 4px 0 0; font-size: 0.9rem; }
.link { color: var(--primario); text-decoration: none; }
.link:hover { text-decoration: underline; }
.bloque { margin-bottom: 28px; }
.error-form { padding: 10px; margin-bottom: 12px; border-radius: 8px; background: var(--error-fondo); color: var(--error); }
.aviso { padding: 10px; margin-bottom: 12px; border-radius: 8px; background: var(--superficie); border: 1px solid var(--borde); }
.mi-plata { display: grid; gap: 10px; padding: 16px; border: 1px solid var(--borde); border-radius: 12px; }
.mi-plata .total { display: grid; }
.mi-plata .total span { color: var(--texto-suave); }
.mi-plata .total strong { font-size: 1.8rem; }
.mi-plata .detalle { display: flex; flex-wrap: wrap; gap: 16px; color: var(--texto-suave); }
.mi-plata .detalle strong { color: var(--texto); }
.lista-recordatorios { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.recordatorio { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 14px; border: 1px solid var(--borde); border-radius: 10px; }
.recordatorio .info { display: grid; gap: 2px; min-width: 0; }
.filtros { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
.filtros label { font-size: 0.9rem; color: var(--texto-suave); min-width: 0; }
.filtros input, .filtros select {
  display: block; width: 100%; margin-top: 4px; padding: 8px;
  background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px;
}
.paginas { display: flex; gap: 12px; align-items: center; justify-content: center; margin-top: 16px; flex-wrap: wrap; }
.paginas button { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; }
.paginas button:disabled { opacity: 0.5; cursor: default; }
button.primario { padding: 9px 16px; border-radius: 8px; background: var(--primario); color: var(--primario-texto); border: 1px solid var(--primario); font-weight: 600; cursor: pointer; }
@media (max-width: 639px) {
  .cabecera { align-items: stretch; }
  .recordatorio { align-items: stretch; }
  .recordatorio .primario { width: 100%; }
  .mi-plata .total strong { font-size: 1.5rem; }
}
</style>
