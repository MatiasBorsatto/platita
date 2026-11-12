<script setup>
import { TIPOS_PAGO, MONEDAS, esTarjeta, describirTarjeta, errorDelFormulario, payloadDelFormulario } from '../utils/gastoFijo.js'
import { listarGrupos } from '../services/grupos.js'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import CargandoIndicador from '../components/CargandoIndicador.vue'
import { confirmar } from '../services/dialogo.js'
import { listarCategorias } from '../services/categorias.js'
import { listarGastosFijos, crearGastoFijo, eliminarGastoFijo } from '../services/gastos-fijos.js'
import { formatearMonto, formatearMontoEn, aCentavos, deCentavos } from '../utils/formato.js'

const router = useRouter()
const gastos = ref([])
const categorias = ref([])
const cargando = ref(false)
const error = ref('')
const aviso = ref('')
const mostrarFormulario = ref(false)
const nombre = ref('')
const diaVencimiento = ref('')
const categoriaId = ref('')
const tipoPago = ref('simple')
const moneda = ref('ARS')
const ambito = ref('propio')
const grupoId = ref('')
const grupos = ref([])
const ultimosCuatro = ref('')
const banco = ref('')
const titular = ref('')
const alias = ref('')

const nombreCategoria = (id) => categorias.value.find((c) => c.id === id)?.nombre ?? 'Sin categoría'
const diaValido = (v) => /^\d+$/.test(String(v).trim()) && Number(v) >= 1 && Number(v) <= 31

// Un total por moneda: nunca se suman pesos con dólares.
const totalesMes = computed(() => {
  const porMoneda = new Map()
  for (const g of gastos.value) {
    const moneda = g.moneda ?? 'ARS'
    porMoneda.set(moneda, (porMoneda.get(moneda) ?? 0n) + aCentavos(g.resumen?.totalMes ?? '0.00'))
  }
  return [...porMoneda].map(([moneda, centavos]) => ({ moneda, total: deCentavos(centavos) }))
})

function descripcionConcepto(c) {
  const monto = formatearMonto(c.montoCuota)
  if (c.cuotasTotales === null) return `${monto} por mes`
  return `${monto} · ${c.cuotasPagadas} de ${c.cuotasTotales} cuotas pagadas`
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    gastos.value = await listarGastosFijos()
  } catch (e) {
    error.value = e.mensaje || 'No se pudieron cargar los gastos fijos.'
  } finally {
    cargando.value = false
  }
}

async function abrirFormulario() {
  mostrarFormulario.value = true
  error.value = ''
  aviso.value = ''
  if (!grupos.value.length) grupos.value = await listarGrupos().catch(() => [])
}

function cerrarFormulario() {
  mostrarFormulario.value = false
  nombre.value = ''
  diaVencimiento.value = ''
  categoriaId.value = ''
  tipoPago.value = 'simple'
  moneda.value = 'ARS'
  ambito.value = 'propio'
  grupoId.value = ''
  ultimosCuatro.value = ''
  banco.value = ''
  titular.value = ''
  alias.value = ''
}

async function crear() {
  const form = {
    nombre: nombre.value, diaVencimiento: diaVencimiento.value, categoriaId: categoriaId.value,
    tipoPago: tipoPago.value, moneda: moneda.value, ambito: ambito.value, grupoId: grupoId.value,
    ultimosCuatro: ultimosCuatro.value, banco: banco.value, titular: titular.value, alias: alias.value
  }
  error.value = errorDelFormulario(form) ?? ''
  if (error.value) return
  try {
    const gasto = await crearGastoFijo(payloadDelFormulario(form))
    cerrarFormulario()
    await router.push(`/gastos-fijos/${gasto.id}`)
  } catch (e) {
    error.value = e.mensaje || 'No se pudo crear el gasto fijo.'
  }
}

async function eliminar(gasto) {
  if (!(await confirmar(`¿Eliminar el gasto fijo "${gasto.nombre}"? Si tiene pagos, se archivará y se conservará el historial.`))) return
  error.value = ''
  aviso.value = ''
  try {
    const r = await eliminarGastoFijo(gasto.id)
    await cargar()
    aviso.value = r.archivado
      ? 'El gasto fijo se archivó porque tiene pagos registrados.'
      : 'Gasto fijo eliminado.'
  } catch (e) {
    error.value = e.mensaje || 'No se pudo eliminar el gasto fijo.'
  }
}

onMounted(async () => {
  try {
    categorias.value = await listarCategorias()
  } catch {
    categorias.value = []
  }
  await cargar()
})
</script>

<template>
  <section>
    <div class="cabecera">
      <div>
        <h1>Gastos fijos</h1>
        <p class="suave">Tus servicios y cuotas de todos los meses.</p>
      </div>
      <button type="button" class="primario" data-agregar data-tour="agregar-gasto-fijo" @click="abrirFormulario">Agregar gasto fijo</button>
    </div>

    <div v-if="error" class="error-form" role="alert">{{ error }}</div>
    <div v-if="aviso" class="aviso" role="status">{{ aviso }}</div>

    <form v-if="mostrarFormulario" class="form-fijo panel" novalidate @submit.prevent="crear">
      <h2>Nuevo gasto fijo</h2>
      <label>Nombre
        <input v-model="nombre" name="nombre" type="text" maxlength="100" placeholder="Casa, celular, gimnasio..." />
      </label>
      <label>Día de vencimiento
        <input v-model="diaVencimiento" name="diaVencimiento" type="number" min="1" max="31" />
      </label>
      <label>Categoría
        <select v-model="categoriaId" name="categoriaId">
          <option value="">Sin categoría</option>
          <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
        </select>
      </label>
      <fieldset class="grupo-campos">
        <legend>Tipo de gasto</legend>
        <label>Cómo se paga
          <select v-model="tipoPago" name="tipoPago">
            <option v-for="t in TIPOS_PAGO" :key="t.valor" :value="t.valor">{{ t.texto }}</option>
          </select>
        </label>
        <label v-if="esTarjeta(tipoPago)" class="aviso-privacidad">
          Solo los últimos cuatro dígitos. Nunca cargues el número completo ni el código de seguridad.
        </label>
        <template v-if="esTarjeta(tipoPago)">
          <label>Últimos cuatro dígitos
            <input v-model="ultimosCuatro" name="ultimosCuatro" type="text" inputmode="numeric" maxlength="4" autocomplete="off" />
          </label>
          <label>Banco o entidad
            <input v-model="banco" name="banco" type="text" maxlength="60" />
          </label>
          <label>Titular
            <input v-model="titular" name="titular" type="text" maxlength="100" />
          </label>
          <label>Alias (opcional)
            <input v-model="alias" name="alias" type="text" maxlength="60" placeholder="Tarjeta principal" />
          </label>
        </template>
        <label>Moneda
          <select v-model="moneda" name="moneda">
            <option v-for="m in MONEDAS" :key="m" :value="m">{{ m }}</option>
          </select>
        </label>
      </fieldset>
      <fieldset class="grupo-campos">
        <legend>De quién es</legend>
        <label>Ámbito
          <select v-model="ambito" name="ambito">
            <option value="propio">Propio (solo yo)</option>
            <option value="grupo">Del grupo familiar</option>
          </select>
        </label>
        <label v-if="ambito === 'grupo'">Grupo
          <select v-model="grupoId" name="grupoId">
            <option value="">Elegí un grupo</option>
            <option v-for="g in grupos" :key="g.id" :value="g.id">{{ g.nombre }}</option>
          </select>
        </label>
      </fieldset>
      <div class="acciones">
        <button type="submit" class="primario">Crear y agregar conceptos</button>
        <button type="button" @click="cerrarFormulario">Cancelar</button>
      </div>
    </form>

    <CargandoIndicador v-if="cargando" variante="esqueleto" />
    <p v-else-if="!gastos.length" class="vacio">Todavía no cargaste gastos fijos.</p>

    <template v-else>
      <p class="resumen-mes">Total estimado de este mes:
        <template v-for="(t, i) in totalesMes" :key="t.moneda">{{ i ? ' · ' : '' }}<strong>{{ formatearMontoEn(t.total, t.moneda) }}</strong></template>
      </p>
      <ul class="lista">
        <li v-for="g in gastos" :key="g.id" class="item panel" data-gasto-fijo>
          <div class="fila-cabecera">
            <div class="titulo">
              <h2><RouterLink :to="`/gastos-fijos/${g.id}`">{{ g.nombre }}</RouterLink></h2>
              <p class="suave">Vence el día {{ g.diaVencimiento }} · {{ nombreCategoria(g.categoriaId) }}</p>
              <p v-if="describirTarjeta(g)" class="suave tarjeta" data-tarjeta>{{ describirTarjeta(g) }}</p>
            </div>
            <div class="monto-mes">
              <strong>{{ formatearMontoEn(g.resumen?.totalMes ?? '0.00', g.moneda) }}</strong>
              <small>este mes</small>
            </div>
          </div>

          <ul v-if="g.conceptos.length" class="conceptos">
            <li v-for="c in g.conceptos" :key="c.id">
              <strong>{{ c.nombre }}</strong>
              <span>{{ descripcionConcepto(c) }}</span>
            </li>
          </ul>
          <p v-else class="suave">Sin conceptos todavía.</p>

          <div class="fila-pie">
            <span class="suave">
              {{ g.resumen?.pendientes ?? 0 }} pendientes
              <template v-if="g.resumen?.proximoVencimiento"> · próximo {{ g.resumen.proximoVencimiento }}</template>
            </span>
            <span class="acciones">
              <RouterLink class="boton" :to="`/gastos-fijos/${g.id}`">Ver detalle</RouterLink>
              <button type="button" @click="eliminar(g)">Eliminar</button>
            </span>
          </div>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
h1 { font-size: 1.5rem; margin: 0; }
h2 { font-size: 1.1rem; margin: 0; overflow-wrap: anywhere; }
.cabecera { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.suave { color: var(--texto-suave); margin: 4px 0 0; font-size: 0.9rem; }
.error-form, .aviso { padding: 10px; margin-bottom: 12px; border-radius: 8px; }
.error-form { background: var(--error-fondo); color: var(--error); }
.aviso { background: var(--superficie); border: 1px solid var(--borde); }
.resumen-mes { color: var(--texto-suave); margin: 0 0 12px; }
.lista { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.item { padding: 14px; border: 1px solid var(--borde); border-radius: 12px; }
.fila-cabecera, .fila-pie { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.titulo { min-width: 0; }
.titulo a { color: var(--texto); text-decoration: none; }
.titulo a:hover { text-decoration: underline; }
.monto-mes { display: grid; text-align: right; }
.monto-mes small { color: var(--texto-suave); }
.conceptos { list-style: none; padding: 0; margin: 12px 0; display: grid; gap: 6px; }
.conceptos li { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 8px 10px; background: var(--superficie-elevada); border-radius: 8px; }
.conceptos span { color: var(--texto-suave); font-size: 0.9rem; }
.fila-pie { align-items: center; margin-top: 8px; }
.fila-pie .suave { margin: 0; }
.acciones { display: flex; gap: 8px; flex-wrap: wrap; }
.form-fijo { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; align-items: end; margin-bottom: 20px; padding: 14px; border: 1px solid var(--borde); border-radius: 12px; }
.form-fijo h2 { grid-column: 1 / -1; }
.form-fijo label { display: block; font-size: 0.9rem; color: var(--texto-suave); min-width: 0; }
.form-fijo input, .form-fijo select { display: block; width: 100%; margin-top: 4px; padding: 10px; background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px; }
.form-fijo .acciones { grid-column: 1 / -1; }
button, .boton { padding: 10px 16px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; text-decoration: none; font: inherit; }
.primario { background: var(--primario); color: var(--primario-texto); border-color: var(--primario); font-weight: 600; }
.primario:disabled { opacity: 0.5; cursor: default; }
@media (max-width: 639px) {
  .cabecera { align-items: stretch; }
  .cabecera .primario { width: 100%; }
  .monto-mes { text-align: left; }
}
</style>
