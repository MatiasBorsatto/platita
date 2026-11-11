<script setup>
import { onMounted, ref } from 'vue'
import { listarDeudas } from '../services/deudas.js'
import { formatearMonto } from '../utils/formato.js'
import CargandoIndicador from '../components/CargandoIndicador.vue'

const deudas = ref([])
const totales = ref([])
const cargando = ref(false)
const error = ref('')

async function cargar() {
  cargando.value = true
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
</script>

<template>
  <section>
    <h1>Deudas</h1>
    <p class="intro-modulo">Las cuotas de tus gastos fijos que todavía no pagaste. Las vencidas aparecen marcadas en rojo.</p>
    <p v-if="error" class="error-form" role="alert">{{ error }}</p>
    <CargandoIndicador v-if="cargando" variante="esqueleto" />

    <template v-if="!cargando && !error">
      <section class="panel" aria-labelledby="titulo-totales" data-tour="deudas">
        <h2 id="titulo-totales">Totales por moneda</h2>
        <p v-if="totales.length === 0">No tenés deudas pendientes.</p>
        <dl v-else class="totales">
          <div v-for="t in totales" :key="t.moneda" class="total">
            <dt>{{ t.moneda }} pendiente</dt>
            <dd>{{ mostrar(t.pendiente, t.moneda) }}</dd>
            <dt>Vencido</dt>
            <dd :class="{ vencido: t.vencido !== '0.00' }">{{ mostrar(t.vencido, t.moneda) }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="deudas.length" class="panel" aria-labelledby="titulo-lista">
        <h2 id="titulo-lista">Cuotas sin pagar</h2>
        <ul class="lista">
          <li v-for="d in deudas" :key="d.id" :class="{ vencida: d.vencida }">
            <span class="nombre">{{ d.nombre }}</span>
            <span class="detalle">{{ d.mes }} · vence {{ d.fechaVencimiento }} · {{ d.ambito === 'grupo' ? 'Grupo' : 'Propio' }}</span>
            <span class="monto">{{ mostrar(d.monto, d.moneda) }}</span>
            <span class="etiqueta">{{ d.vencida ? 'Vencida' : 'Pendiente' }}</span>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>

<style scoped>
h1 { font-size: 1.5rem; margin-top: 0; }
h2 { font-size: 1.1rem; margin: 0 0 12px; }
.panel { display: grid; gap: 12px; margin-bottom: 20px; }
.totales { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 0; }
.total { padding: 14px; background: var(--superficie-elevada); border: 1px solid var(--borde); border-radius: var(--radio-chico); }
.total dt { color: var(--texto-suave); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; }
.total dd { margin: 2px 0 10px; font-size: 1.2rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.vencido { color: var(--error); }
.lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.lista li { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; padding: 12px; border: 1px solid var(--borde); border-radius: var(--radio-chico); background: var(--superficie); }
.lista li.vencida { border-left: 4px solid var(--error); }
.nombre { font-weight: 600; }
.detalle { grid-column: 1 / -1; color: var(--texto-suave); font-size: 0.85rem; }
.monto { font-weight: 700; font-variant-numeric: tabular-nums; }
.etiqueta { color: var(--texto-suave); font-size: 0.8rem; }
</style>
