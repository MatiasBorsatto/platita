<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CampoMonto from '../components/CampoMonto.vue'
import CargandoIndicador from '../components/CargandoIndicador.vue'
import { confirmar } from '../services/dialogo.js'
import { listarCategorias } from '../services/categorias.js'
import {
  obtenerGastoFijo, editarGastoFijo, eliminarGastoFijo,
  crearConcepto, editarConcepto, eliminarConcepto,
  pagarCuota, deshacerPago
} from '../services/gastos-fijos.js'
import { hoyLocal, formatearMonto, aCentavos, deCentavos } from '../utils/formato.js'
import { describirTarjeta } from '../utils/gastoFijo.js'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const ahora = new Date()
const mes = ref(`${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`)
const fechaPago = ref(hoyLocal())

const gasto = ref(null)
const categorias = ref([])
const cargando = ref(true)
const error = ref('')
const aviso = ref('')
const editandoGasto = ref(false)
const formGasto = reactive({ nombre: '', diaVencimiento: '', categoriaId: '' })

const mostrarFormConcepto = ref(false)
const conceptoEditandoId = ref(null)
const formConcepto = reactive({
  nombre: '', montoTotal: '', recurrente: true, cuotas: '', mesInicio: mes.value
})

const cuotas = computed(() => gasto.value?.cuotas ?? [])
const totalMes = computed(() => deCentavos(
  cuotas.value.reduce((acc, c) => acc + aCentavos(c.monto), 0n)
))
const pendientes = computed(() => cuotas.value.filter((c) => c.estado !== 'pagado').length)

const nombreCategoria = (catId) => categorias.value.find((c) => c.id === catId)?.nombre ?? 'Sin categoría'
const conceptoDe = (cuota) => gasto.value?.conceptos.find((c) => c.id === cuota.conceptoId) ?? null

function situacion(cuota) {
  if (cuota.estado === 'pagado') return 'pagado'
  if (cuota.situacion) return cuota.situacion
  return 'pendiente'
}

function textoEstado(cuota) {
  return {
    pagado: 'Pagado',
    vencido: 'Vencido',
    proximo: 'Vence pronto',
    pendiente: 'Pendiente'
  }[situacion(cuota)]
}

function descripcionConcepto(c) {
  if (c.cuotasTotales === null) return `${formatearMonto(c.montoCuota)} por mes`
  return `${formatearMonto(c.montoCuota)} por cuota · ${c.cuotasPagadas} de ${c.cuotasTotales} pagadas`
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    gasto.value = await obtenerGastoFijo(id, mes.value)
    formGasto.nombre = gasto.value.nombre
    formGasto.diaVencimiento = gasto.value.diaVencimiento
    formGasto.categoriaId = gasto.value.categoriaId ?? ''
  } catch (e) {
    error.value = e.mensaje || 'No se pudo cargar el gasto fijo.'
  } finally {
    cargando.value = false
  }
}

function abrirEdicionGasto() {
  error.value = ''
  aviso.value = ''
  formGasto.nombre = gasto.value.nombre
  formGasto.diaVencimiento = gasto.value.diaVencimiento
  formGasto.categoriaId = gasto.value.categoriaId ?? ''
  editandoGasto.value = true
}

async function guardarGasto() {
  if (!formGasto.nombre.trim()) {
    error.value = 'Ingresá el nombre del gasto fijo.'
    return
  }
  const dia = Number(formGasto.diaVencimiento)
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    error.value = 'El día de vencimiento debe estar entre 1 y 31.'
    return
  }
  try {
    await editarGastoFijo(id, {
      nombre: formGasto.nombre.trim(),
      diaVencimiento: dia,
      categoriaId: formGasto.categoriaId || null
    })
    editandoGasto.value = false
    aviso.value = 'Gasto fijo actualizado.'
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo actualizar el gasto fijo.'
  }
}

async function eliminarGasto() {
  if (!(await confirmar(`¿Eliminar el gasto fijo "${gasto.value.nombre}"? Si tiene pagos, se archivará y se conservará el historial.`))) return
  try {
    const r = await eliminarGastoFijo(id)
    if (r.archivado) {
      aviso.value = 'El gasto fijo se archivó porque tiene pagos registrados.'
      return
    }
    await router.push('/gastos-fijos')
  } catch (e) {
    error.value = e.mensaje || 'No se pudo eliminar el gasto fijo.'
  }
}

function abrirConceptoNuevo() {
  error.value = ''
  aviso.value = ''
  conceptoEditandoId.value = null
  Object.assign(formConcepto, {
    nombre: '', montoTotal: '', recurrente: true, cuotas: '', mesInicio: mes.value
  })
  mostrarFormConcepto.value = true
}

function editarConceptoDe(concepto) {
  if (!concepto) return
  error.value = ''
  aviso.value = ''
  conceptoEditandoId.value = concepto.id
  Object.assign(formConcepto, {
    nombre: concepto.nombre,
    montoTotal: String(concepto.montoTotal),
    recurrente: concepto.cuotasTotales === null,
    cuotas: concepto.cuotasTotales ?? '',
    mesInicio: concepto.mesInicio
  })
  mostrarFormConcepto.value = true
}

function cerrarFormConcepto() {
  mostrarFormConcepto.value = false
  conceptoEditandoId.value = null
}

async function guardarConcepto() {
  if (!formConcepto.nombre.trim()) {
    error.value = 'Ingresá el nombre del concepto.'
    return
  }
  if (!formConcepto.montoTotal) {
    error.value = 'Ingresá un monto válido mayor a 0 (hasta 2 decimales).'
    return
  }
  if (!formConcepto.mesInicio) {
    error.value = 'Elegí el mes de inicio.'
    return
  }
  const datos = {
    nombre: formConcepto.nombre.trim(),
    montoTotal: formConcepto.montoTotal,
    mesInicio: formConcepto.mesInicio
  }
  if (formConcepto.recurrente) {
    datos.recurrente = true
  } else {
    const cuotasNum = Number(formConcepto.cuotas)
    if (!Number.isInteger(cuotasNum) || cuotasNum < 1) {
      error.value = 'La cantidad de cuotas debe ser un número entero mayor a 0.'
      return
    }
    datos.cuotas = cuotasNum
  }
  try {
    if (conceptoEditandoId.value) {
      await editarConcepto(id, conceptoEditandoId.value, datos)
      aviso.value = 'Concepto actualizado. Las cuotas pagadas o vencidas no se modifican.'
    } else {
      await crearConcepto(id, datos)
      aviso.value = 'Concepto agregado.'
    }
    cerrarFormConcepto()
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo guardar el concepto.'
  }
}

async function borrarConcepto(concepto) {
  if (!concepto) return
  const mensaje = concepto.cuotasPagadas > 0
    ? `¿Eliminar el concepto "${concepto.nombre}"? Tiene cuotas pagadas, así que se archivará y se conservará el historial.`
    : `¿Eliminar el concepto "${concepto.nombre}"?`
  if (!(await confirmar(mensaje))) return
  try {
    const r = await eliminarConcepto(id, concepto.id)
    aviso.value = r.archivado ? 'Concepto archivado.' : 'Concepto eliminado.'
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo eliminar el concepto.'
  }
}

async function pagar(cuota) {
  error.value = ''
  aviso.value = ''
  try {
    await pagarCuota(id, cuota.id, fechaPago.value ? { fecha: fechaPago.value } : {})
    aviso.value = 'Pago registrado. El gasto ya aparece en Movimientos.'
    await cargar()
    window.dispatchEvent(new Event('notificaciones:cambio'))
  } catch (e) {
    error.value = e.mensaje || 'No se pudo registrar el pago.'
  }
}

async function deshacer(cuota) {
  error.value = ''
  aviso.value = ''
  try {
    await deshacerPago(id, cuota.id)
    aviso.value = 'Pago deshecho. La cuota volvió a quedar pendiente.'
    await cargar()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo deshacer el pago.'
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
    <RouterLink to="/gastos-fijos" class="volver">&larr; Gastos fijos</RouterLink>

    <div v-if="error" class="error-form" role="alert">{{ error }}</div>
    <div v-if="aviso" class="aviso" role="status">{{ aviso }}</div>

    <CargandoIndicador v-if="cargando" variante="esqueleto" />

    <template v-else-if="gasto">
      <div class="cabecera">
        <div>
          <h1>{{ gasto.nombre }}</h1>
          <p class="suave">Vence el día {{ gasto.diaVencimiento }} · {{ nombreCategoria(gasto.categoriaId) }}</p>
          <p v-if="describirTarjeta(gasto)" class="suave" data-tarjeta>{{ describirTarjeta(gasto) }}</p>
        </div>
        <div class="acciones">
          <button type="button" @click="abrirEdicionGasto">Editar gasto</button>
          <button type="button" @click="eliminarGasto">Eliminar</button>
        </div>
      </div>

      <form v-if="editandoGasto" class="form panel" novalidate @submit.prevent="guardarGasto">
        <label>Nombre <input v-model="formGasto.nombre" name="nombre" type="text" maxlength="100" /></label>
        <label>Día de vencimiento <input v-model="formGasto.diaVencimiento" name="diaVencimiento" type="number" min="1" max="31" /></label>
        <label>Categoría
          <select v-model="formGasto.categoriaId" name="categoriaId">
            <option value="">Sin categoría</option>
            <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
          </select>
        </label>
        <div class="acciones">
          <button type="submit" class="primario">Guardar</button>
          <button type="button" @click="editandoGasto = false">Cancelar</button>
        </div>
      </form>

      <div class="bloque">
        <div class="cabecera-seccion">
          <h2>Conceptos</h2>
          <button type="button" class="primario" data-agregar-concepto @click="abrirConceptoNuevo">Agregar concepto</button>
        </div>

        <form v-if="mostrarFormConcepto" class="form panel" novalidate @submit.prevent="guardarConcepto">
          <h3>{{ conceptoEditandoId ? 'Editar concepto' : 'Nuevo concepto' }}</h3>
          <label>Nombre <input v-model="formConcepto.nombre" name="conceptoNombre" type="text" maxlength="100" placeholder="Celular, gimnasio..." /></label>
          <label>Monto total
            <CampoMonto v-model="formConcepto.montoTotal" name="conceptoMonto" />
          </label>
          <label>Tipo
            <select v-model="formConcepto.recurrente" name="conceptoTipo">
              <option :value="true">Recurrente (todos los meses)</option>
              <option :value="false">En cuotas</option>
            </select>
          </label>
          <label v-if="!formConcepto.recurrente">Cantidad de cuotas
            <input v-model="formConcepto.cuotas" name="conceptoCuotas" type="number" min="1" max="120" />
          </label>
          <label>Mes de inicio
            <input v-model="formConcepto.mesInicio" name="conceptoMesInicio" type="month" />
          </label>
          <div class="acciones">
            <button type="submit" class="primario">Guardar concepto</button>
            <button type="button" @click="cerrarFormConcepto">Cancelar</button>
          </div>
        </form>

        <p v-if="!gasto.conceptos.length" class="suave">Todavía no hay conceptos. Agregá el primero.</p>
        <ul v-else class="lista panel">
          <li v-for="c in gasto.conceptos" :key="c.id" class="fila" data-concepto>
            <span class="datos">
              <strong>{{ c.nombre }}</strong>
              <small>{{ descripcionConcepto(c) }}</small>
            </span>
            <span class="acciones">
              <button type="button" @click="editarConceptoDe(c)">Editar</button>
              <button type="button" @click="borrarConcepto(c)">Eliminar</button>
            </span>
          </li>
        </ul>
      </div>

      <div class="bloque">
        <div class="cabecera-seccion">
          <h2>Vencimientos</h2>
          <div class="selector-mes">
            <label>Mes <input v-model="mes" type="month" @change="cargar" /></label>
            <label>Fecha de pago <input v-model="fechaPago" type="date" /></label>
          </div>
        </div>

        <p class="resumen">
          Este mes: <strong>{{ formatearMonto(totalMes) }}</strong> · {{ pendientes }} pendiente(s)
        </p>

        <p v-if="!cuotas.length" class="suave">No hay vencimientos para este mes.</p>
        <ul v-else class="lista panel">
          <li v-for="c in cuotas" :key="c.id" class="fila" data-cuota>
            <span class="datos">
              <strong>{{ c.conceptoNombre }} <span class="etiqueta" :class="situacion(c)">{{ textoEstado(c) }}</span></strong>
              <small>{{ c.fechaVencimiento }} · {{ formatearMonto(c.monto) }}<template v-if="c.numeroCuota"> · cuota {{ c.numeroCuota }}<template v-if="c.cuotas">/{{ c.cuotas }}</template></template></small>
            </span>
            <span class="acciones">
              <button v-if="c.estado !== 'pagado'" type="button" class="primario" @click="pagar(c)">Pagar</button>
              <button v-else type="button" @click="deshacer(c)">Deshacer pago</button>
              <button
                type="button"
                :disabled="c.estado === 'pagado'"
                :title="c.estado === 'pagado' ? 'Deshacé el pago para editar el concepto' : ''"
                @click="editarConceptoDe(conceptoDe(c))"
              >Editar</button>
              <button type="button" @click="borrarConcepto(conceptoDe(c))">Eliminar</button>
            </span>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
h1 { font-size: 1.5rem; margin: 0; overflow-wrap: anywhere; }
h2 { font-size: 1.15rem; margin: 0; }
h3 { font-size: 1rem; margin: 0; grid-column: 1 / -1; }
.suave { color: var(--texto-suave); font-size: 0.9rem; margin: 4px 0 0; }
.volver { display: inline-block; margin-bottom: 12px; color: var(--primario); }
.error-form, .aviso { padding: 10px; margin-bottom: 12px; border-radius: 8px; }
.error-form { background: var(--error-fondo); color: var(--error); }
.aviso { background: var(--superficie); border: 1px solid var(--borde); }
.cabecera { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.cabecera-seccion { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.bloque { margin-bottom: 28px; }
.selector-mes { display: flex; gap: 12px; flex-wrap: wrap; }
.selector-mes label { font-size: 0.9rem; color: var(--texto-suave); }
.selector-mes input { display: block; margin-top: 4px; padding: 8px; background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px; }
.form { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; align-items: end; margin-bottom: 16px; padding: 14px; border: 1px solid var(--borde); border-radius: 12px; }
.form label { display: block; font-size: 0.9rem; color: var(--texto-suave); min-width: 0; }
.form input, .form select { display: block; width: 100%; margin-top: 4px; padding: 10px; background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px; }
.form .acciones { grid-column: 1 / -1; }
.lista { list-style: none; padding: 14px; margin: 0; display: grid; gap: 10px; }
.fila { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px; background: var(--superficie-elevada); border: 1px solid var(--borde); border-radius: 8px; }
.datos { display: grid; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
.datos small { color: var(--texto-suave); }
.acciones { display: flex; gap: 8px; flex-wrap: wrap; }
.resumen { color: var(--texto-suave); margin: 0 0 12px; }
button, .boton { padding: 9px 14px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; font: inherit; }
button:disabled { opacity: 0.5; cursor: default; }
.primario { background: var(--primario); color: var(--primario-texto); border-color: var(--primario); font-weight: 600; }
.etiqueta { display: inline-block; margin-left: 6px; padding: 1px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; background: var(--superficie); border: 1px solid var(--borde); color: var(--texto-suave); }
.etiqueta.pagado { color: var(--primario); border-color: var(--primario); }
.etiqueta.vencido { color: var(--error); border-color: var(--error); }
.etiqueta.proximo { color: var(--acento); border-color: var(--acento); }
@media (max-width: 639px) {
  .cabecera, .cabecera-seccion { align-items: stretch; }
  .acciones, .selector-mes { width: 100%; }
  .acciones button { flex: 1 1 auto; }
}
</style>
