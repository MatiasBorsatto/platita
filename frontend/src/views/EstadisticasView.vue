<script setup>
import { ref, onMounted } from 'vue'
import GraficoIngresosGastos from '../charts/GraficoIngresosGastos.vue'
import GraficoGastosPorCategoria from '../charts/GraficoGastosPorCategoria.vue'
import GraficoAhorroNeto from '../charts/GraficoAhorroNeto.vue'
import CifraAnimada from '../components/CifraAnimada.vue'
import { resumenMensual, serieHistorica } from '../services/estadisticas.js'

const MAX_MESES = 24
const aMes = (fecha) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
const ahora = new Date()

const mes = ref(aMes(ahora))
const desde = ref(aMes(new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1)))
const hasta = ref(aMes(ahora))
const resumen = ref(null)
const serie = ref([])
const errorMes = ref('')
const errorRango = ref('')
const cargandoMes = ref(false)
const cargandoRango = ref(false)

async function cargarMes() {
  if (!mes.value) return
  cargandoMes.value = true
  errorMes.value = ''
  try {
    resumen.value = await resumenMensual(mes.value)
  } catch (e) {
    resumen.value = null
    errorMes.value = e.mensaje || 'No se pudo cargar el resumen del mes.'
  } finally {
    cargandoMes.value = false
  }
}

async function cargarRango() {
  if (!desde.value || !hasta.value) return
  if (desde.value > hasta.value) {
    errorRango.value = 'El mes inicial no puede ser posterior al final.'
    return
  }
  const [d1, d2] = desde.value.split('-').map(Number)
  const [h1, h2] = hasta.value.split('-').map(Number)
  if ((h1 - d1) * 12 + (h2 - d2) + 1 > MAX_MESES) {
    errorRango.value = `El rango puede abarcar hasta ${MAX_MESES} meses.`
    return
  }
  cargandoRango.value = true
  errorRango.value = ''
  try {
    serie.value = await serieHistorica(desde.value, hasta.value)
  } catch (e) {
    serie.value = []
    errorRango.value = e.mensaje || 'No se pudo cargar la serie histórica.'
  } finally {
    cargandoRango.value = false
  }
}

onMounted(() => {
  cargarMes()
  cargarRango()
})
</script>

<template>
  <section class="estadisticas">
    <h1>Estadísticas</h1>

    <section aria-labelledby="titulo-mes" class="bloque">
      <h2 id="titulo-mes">Resumen del mes</h2>
      <label class="campo">Mes
        <input v-model="mes" type="month" @change="cargarMes" />
      </label>
      <p v-if="errorMes" class="error-form" role="alert">{{ errorMes }}</p>
      <CargandoIndicador v-if="cargandoMes" />
      <template v-if="resumen">
        <dl class="cifras">
          <div class="cifra ingresos"><dt>Ingresos</dt><dd data-ingresos><CifraAnimada :valor="resumen.ingresos" /></dd></div>
          <div class="cifra gastos"><dt>Gastos</dt><dd data-gastos><CifraAnimada :valor="resumen.gastos" /></dd></div>
          <div class="cifra ahorro"><dt>Ahorro neto</dt><dd data-ahorro><CifraAnimada :valor="resumen.ahorroNeto" /></dd></div>
          <div class="cifra aportes"><dt>Aportes a metas</dt><dd data-aportes><CifraAnimada :valor="resumen.aportesMetas" /></dd></div>
        </dl>
        <p v-if="resumen.gastosPorCategoria.length === 0">No hay gastos en este mes.</p>
        <GraficoGastosPorCategoria v-else :datos="resumen.gastosPorCategoria" />
      </template>
    </section>

    <section aria-labelledby="titulo-rango" class="bloque">
      <h2 id="titulo-rango">Evolución</h2>
      <div class="rango">
        <label class="campo">Desde
          <input v-model="desde" type="month" @change="cargarRango" />
        </label>
        <label class="campo">Hasta
          <input v-model="hasta" type="month" @change="cargarRango" />
        </label>
      </div>
      <p v-if="errorRango" class="error-form" role="alert">{{ errorRango }}</p>
      <CargandoIndicador v-if="cargandoRango" />
      <template v-if="serie.length">
        <GraficoIngresosGastos :datos="serie" />
        <GraficoAhorroNeto :datos="serie" />
      </template>
    </section>
  </section>
</template>

<style scoped>
h1 { font-size: 1.5rem; margin-top: 0; }
h2 { font-size: 1.1rem; }
.estadisticas { display: grid; gap: 24px; min-width: 0; }
.bloque { display: grid; gap: 16px; min-width: 0; padding: 20px; background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); box-shadow: var(--sombra); }
.bloque h2 { margin: 0; }
.rango { display: flex; flex-wrap: wrap; gap: 12px; }
.campo { display: grid; gap: 4px; color: var(--texto-suave); font-size: 0.9rem; min-width: 0; }
.campo input { padding: 10px; background: var(--fondo); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px; max-width: 100%; }
.cifras { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin: 0; }
.cifra { position: relative; padding: 14px 14px 14px 18px; background: var(--superficie-elevada); border: 1px solid var(--borde); border-radius: var(--radio-chico); min-width: 0; overflow: hidden; }
.cifra::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--color, var(--primario)); }
.cifra dt { color: var(--texto-suave); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.cifra dd { margin: 4px 0 0; font-size: 1.25rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.ingresos { --color: var(--grafico-1); }
.gastos { --color: var(--insignia); }
.ahorro { --color: var(--acento); }
.aportes { --color: var(--grafico-5); }
dt { color: var(--texto-suave); font-size: 0.85rem; }
dd { margin: 4px 0 0; font-weight: 600; overflow-wrap: anywhere; }
.error-form { padding: 10px; margin: 0; border-radius: 8px; background: var(--error-fondo); color: var(--error); }
</style>
