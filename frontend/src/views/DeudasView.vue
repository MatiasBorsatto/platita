<script setup>
import { computed, onMounted, ref } from 'vue'
import { listarDeudas } from '../services/deudas.js'
import { pagarCuota } from '../services/gastos-fijos.js'
import { confirmar } from '../services/dialogo.js'
import { formatearMonto, aCentavos, deCentavos } from '../utils/formato.js'
import CargandoIndicador from '../components/CargandoIndicador.vue'

const deudas = ref([])
const totales = ref([])
const cargando = ref(false)
const error = ref('')
const aviso = ref('')
const filtro = ref('todas')

const FILTROS = [
  { clave: 'todas', texto: 'Todas', titulo: 'Cuotas sin pagar', vacio: 'No tenés cuotas sin pagar.' },
  { clave: 'vencidas', texto: 'Vencidas', titulo: 'Cuotas vencidas', vacio: 'No tenés cuotas vencidas.' },
  { clave: 'por-vencer', texto: 'Por vencer', titulo: 'Cuotas por vencer', vacio: 'No tenés cuotas por vencer.' }
]
const cumple = {
  todas: () => true,
  vencidas: (d) => d.vencida,
  'por-vencer': (d) => !d.vencida
}
const actual = computed(() => FILTROS.find((f) => f.clave === filtro.value))
const visibles = computed(() => deudas.value.filter(cumple[filtro.value]))
const cantidad = (clave) => deudas.value.filter(cumple[clave]).length

async function cargar({ conIndicador = true } = {}) {
  if (conIndicador) cargando.value = true
  error.value = ''
  try {
    const datos = await listarDeudas()
    deudas.value = datos.deudas
    totales.value = datos.totales
  } catch (e) {
    error.value = e.mensaje || 'No se pudieron cargar las deudas.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

// Los montos vienen de la API como texto con dos decimales; se muestran con su moneda, sin convertir.
const mostrar = (monto, moneda) => `${moneda} ${formatearMonto(monto).replace(/^-?\$ /, '')}`
// "Pendiente" de la API es todo lo que falta pagar; lo que está por vencer es eso menos lo vencido.
const porVencer = (t) => deCentavos(aCentavos(t.pendiente) - aCentavos(t.vencido))

// Pagar una cuota la registra como gasto en Movimientos, igual que desde Gastos fijos.
async function pagar(d) {
  aviso.value = ''
  const que = d.concepto ? `${d.nombre} - ${d.concepto}` : d.nombre
  if (!(await confirmar(`¿Registrar el pago de "${que}" (${d.mes}) por ${mostrar(d.monto, d.moneda)}? Se anota como gasto en Movimientos.`))) return
  try {
    await pagarCuota(d.gastoId, d.id)
    await cargar({ conIndicador: false })
    aviso.value = `Pago registrado: "${d.nombre}" ya aparece en Movimientos.`
    window.dispatchEvent(new Event('notificaciones:cambio'))
  } catch (e) {
    error.value = e.mensaje || 'No se pudo registrar el pago.'
  }
}
</script>

<template>
  <section>
    <h1>Deudas</h1>
    <p class="intro-modulo">Las cuotas de tus gastos fijos que todavía no pagaste. Elegí ver las vencidas o las que están por vencer, y pagalas desde acá.</p>
    <p v-if="error" class="error-form" role="alert">{{ error }}</p>
    <p v-if="aviso" class="aviso" role="status">{{ aviso }}</p>
    <CargandoIndicador v-if="cargando" variante="esqueleto" />

    <template v-if="!cargando">
      <section class="panel" aria-labelledby="titulo-totales" data-tour="deudas">
        <h2 id="titulo-totales">Totales por moneda</h2>
        <p v-if="totales.length === 0">No tenés deudas pendientes.</p>
        <dl v-else class="totales">
          <div v-for="t in totales" :key="t.moneda" class="total" :data-total="t.moneda">
            <dt>Total sin pagar ({{ t.moneda }})</dt>
            <dd>{{ mostrar(t.pendiente, t.moneda) }}</dd>
            <dt>Vencido</dt>
            <dd :class="{ vencido: t.vencido !== '0.00' }">{{ mostrar(t.vencido, t.moneda) }}</dd>
            <dt>Por vencer</dt>
            <dd>{{ mostrar(porVencer(t), t.moneda) }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="deudas.length" class="panel" aria-labelledby="titulo-lista">
        <div class="cabecera-lista">
          <h2 id="titulo-lista">{{ actual.titulo }}</h2>
          <div class="filtros" role="group" aria-label="Qué cuotas mostrar">
            <button
              v-for="f in FILTROS"
              :key="f.clave"
              type="button"
              :data-filtro="f.clave"
              :aria-pressed="filtro === f.clave ? 'true' : 'false'"
              :class="{ activo: filtro === f.clave }"
              @click="filtro = f.clave"
            >{{ f.texto }} <span class="cantidad">{{ cantidad(f.clave) }}</span></button>
          </div>
        </div>

        <p v-if="!visibles.length" class="suave">{{ actual.vacio }}</p>
        <ul v-else class="lista">
          <li v-for="d in visibles" :key="d.id" :class="{ vencida: d.vencida }" :data-deuda="d.id">
            <div class="info">
              <span class="nombre">{{ d.nombre }}</span>
              <span v-if="d.concepto" class="concepto">{{ d.concepto }}</span>
              <span class="detalle">{{ d.mes }} · vence {{ d.fechaVencimiento }} · {{ d.ambito === 'grupo' ? 'Grupo' : 'Propio' }}</span>
            </div>
            <div class="importe">
              <span class="monto">{{ mostrar(d.monto, d.moneda) }}</span>
              <span class="etiqueta" :class="{ vencido: d.vencida }">{{ d.vencida ? 'Vencida' : 'Por vencer' }}</span>
            </div>
            <button v-if="d.puedePagar !== false" type="button" class="pagar" data-pagar @click="pagar(d)">Pagar</button>
            <span v-else class="suave nota">La paga quien creó el gasto</span>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>

<style scoped>
h1 { font-size: 1.5rem; margin-top: 0; }
h2 { font-size: 1.1rem; margin: 0; }
.panel { display: grid; gap: 12px; margin-bottom: 20px; }
.aviso { padding: 10px; border-radius: 8px; background: var(--superficie); border: 1px solid var(--borde); }
.suave { color: var(--texto-suave); }
.totales { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 0; }
.total { padding: 14px; background: var(--superficie-elevada); border: 1px solid var(--borde); border-radius: var(--radio-chico); }
.total dt { color: var(--texto-suave); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; }
.total dd { margin: 2px 0 10px; font-size: 1.2rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.total dd:last-child { margin-bottom: 0; }
.vencido { color: var(--error); }
.cabecera-lista { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; justify-content: space-between; }
.filtros { display: flex; flex-wrap: wrap; gap: 6px; }
.filtros button { min-height: 38px; padding: 6px 12px; font-size: 0.9rem; }
.filtros button.activo { background: var(--primario); color: var(--primario-texto); border-color: var(--primario); }
.cantidad { display: inline-block; min-width: 1.5em; margin-left: 4px; padding: 0 6px; border-radius: 999px; background: rgba(127, 127, 127, 0.2); font-size: 0.8rem; text-align: center; }
.lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.lista li { display: grid; grid-template-columns: 1fr auto auto; gap: 8px 16px; align-items: center; padding: 12px; border: 1px solid var(--borde); border-radius: var(--radio-chico); background: var(--superficie); }
.lista li.vencida { border-left: 4px solid var(--error); }
.info { display: grid; gap: 2px; min-width: 0; }
.nombre { font-weight: 600; }
.concepto { font-size: 0.9rem; }
.detalle { color: var(--texto-suave); font-size: 0.85rem; }
.importe { display: grid; justify-items: end; gap: 2px; }
.monto { font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.etiqueta { color: var(--texto-suave); font-size: 0.8rem; }
.pagar { background: var(--primario); color: var(--primario-texto); border-color: var(--primario); }
.nota { font-size: 0.8rem; max-width: 140px; text-align: right; }
@media (max-width: 639px) {
  .lista li { grid-template-columns: 1fr auto; }
  .pagar, .nota { grid-column: 1 / -1; }
  .pagar { width: 100%; }
  .nota { max-width: none; text-align: left; }
}
</style>
