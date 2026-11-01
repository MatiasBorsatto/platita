<script setup>
import CampoMonto from '../components/CampoMonto.vue'
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import FormularioCompra from '../components/FormularioCompra.vue'
import { listarCategorias } from '../services/movimientos.js'
import { listarTarjetas, crearCompra, resumenTarjeta, registrarPago } from '../services/tarjetas.js'
import { formatearMonto, normalizarMonto, hoyLocal } from '../utils/formato.js'

const route = useRoute()
const id = computed(() => route.params.id)
const ahora = new Date()
const mes = ref(`${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`)
const tarjeta = ref(null)
const resumen = ref(null)
const categorias = ref([])
const mostrarCompra = ref(false)
const montoPago = ref('')
const fechaPago = ref(hoyLocal())
const error = ref('')
const aviso = ref('')

const fechaCorta = (f) => (f ? f.split('-').reverse().join('/') : '')
const mesCorto = (m) => m.split('-').reverse().join('/')

async function cargarResumen() {
  if (!mes.value) return
  error.value = ''
  try {
    resumen.value = await resumenTarjeta(id.value, mes.value)
  } catch (e) {
    resumen.value = null
    error.value = e.mensaje || 'No se pudo cargar el resumen.'
  }
}

async function guardarCompra(datos) {
  error.value = ''
  aviso.value = ''
  try {
    await crearCompra(id.value, datos)
    mostrarCompra.value = false
    aviso.value = 'Compra registrada.'
    await cargarResumen()
  } catch (e) {
    error.value = e.mensaje || 'No se pudo registrar la compra.'
  }
}

async function pagar() {
  const monto = normalizarMonto(montoPago.value)
  if (!monto) {
    error.value = 'Ingresá un monto de pago válido mayor a 0 (hasta 2 decimales).'
    return
  }
  error.value = ''
  aviso.value = ''
  try {
    await registrarPago(id.value, { monto, fecha: fechaPago.value })
    montoPago.value = ''
    aviso.value = 'Pago registrado.'
  } catch (e) {
    error.value = e.mensaje || 'No se pudo registrar el pago.'
  }
}

onMounted(async () => {
  try {
    const [tarjetas, cats] = await Promise.all([listarTarjetas(), listarCategorias()])
    tarjeta.value = tarjetas.find((t) => t.id === id.value) ?? null
    categorias.value = cats
  } catch (e) {
    error.value = e.mensaje || 'No se pudo cargar la tarjeta.'
  }
  await cargarResumen()
})
</script>

<template>
  <section>
    <RouterLink to="/tarjetas" class="volver">&larr; Tarjetas</RouterLink>
    <h1>{{ tarjeta?.nombre ?? 'Tarjeta' }}</h1>
    <p v-if="tarjeta" class="suave">Cierra el {{ tarjeta.diaCierre }} · Vence el {{ tarjeta.diaVencimiento }}</p>
    <div v-if="error" class="error-form" role="alert">{{ error }}</div>
    <div v-if="aviso" class="aviso" role="status">{{ aviso }}</div>

    <div class="barra">
      <label>Mes del resumen <input v-model="mes" type="month" @change="cargarResumen" /></label>
      <button type="button" class="primario" @click="mostrarCompra = !mostrarCompra">Nueva compra</button>
    </div>

    <FormularioCompra v-if="mostrarCompra" :categorias="categorias" @guardar="guardarCompra" @cancelar="mostrarCompra = false" />

    <div v-if="resumen" class="resumen">
      <div class="datos">
        <div><span>Período</span><strong>{{ fechaCorta(resumen.desde) }} al {{ fechaCorta(resumen.hasta) }}</strong></div>
        <div><span>Vencimiento</span><strong>{{ fechaCorta(resumen.vencimiento) }}</strong></div>
        <div><span>Total del resumen</span><strong>{{ formatearMonto(resumen.total) }}</strong></div>
      </div>

      <h2>Consumos</h2>
      <p v-if="!resumen.movimientos.length" class="suave">Sin consumos en este resumen.</p>
      <template v-else>
        <div class="tabla-wrap">
          <table class="tabla">
            <thead><tr><th>Fecha</th><th>Descripción</th><th class="num">Monto</th></tr></thead>
            <tbody>
              <tr v-for="m in resumen.movimientos" :key="m.id">
                <td>{{ fechaCorta(m.fecha) }}</td>
                <td>{{ m.descripcion || '-' }}</td>
                <td class="num">{{ formatearMonto(m.monto) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul class="cards">
          <li v-for="m in resumen.movimientos" :key="m.id" class="card">
            <strong>{{ formatearMonto(m.monto) }}</strong>
            <span>{{ m.descripcion || '-' }}</span>
            <small>{{ fechaCorta(m.fecha) }}</small>
          </li>
        </ul>
      </template>

      <h2>Cuotas futuras</h2>
      <p v-if="!resumen.cuotasFuturas.length" class="suave">No hay cuotas futuras.</p>
      <ul v-else class="futuras">
        <li v-for="c in resumen.cuotasFuturas" :key="c.mes">
          <span>{{ mesCorto(c.mes) }}</span><strong>{{ formatearMonto(c.monto) }}</strong>
        </li>
      </ul>
    </div>

    <form class="pago" novalidate @submit.prevent="pagar">
      <h2>Registrar pago del resumen</h2>
      <label>Monto <CampoMonto v-model="montoPago" name="montoPago" /></label>
      <label>Fecha <input v-model="fechaPago" name="fechaPago" type="date" /></label>
      <button type="submit" class="primario">Registrar pago</button>
    </form>
  </section>
</template>

<style scoped>
.volver { color: var(--texto-suave); text-decoration: none; }
.suave { color: var(--texto-suave); }
.error-form { padding: 10px; margin-bottom: 12px; border-radius: 8px; background: var(--error-fondo); color: var(--error); }
.aviso { padding: 10px; margin-bottom: 12px; border-radius: 8px; background: var(--superficie); border: 1px solid var(--borde); }
.barra { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; margin-bottom: 16px; }
.barra label, .pago label { display: block; font-size: 0.9rem; color: var(--texto-suave); }
input { display: block; margin-top: 4px; padding: 10px; max-width: 100%; background: var(--superficie); color: var(--texto); border: 1px solid var(--borde); border-radius: 8px; }
button { padding: 10px 16px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; }
.primario { background: var(--primario); color: var(--primario-texto); border-color: var(--primario); font-weight: 600; }
.datos { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 8px; }
.datos > div { display: grid; gap: 4px; padding: 12px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 12px; }
.datos span { color: var(--texto-suave); font-size: 0.85rem; }
.tabla-wrap { overflow-x: auto; }
.tabla { width: 100%; border-collapse: collapse; }
.tabla th, .tabla td { padding: 10px; text-align: left; border-bottom: 1px solid var(--borde); }
.tabla .num { text-align: right; }
.cards { display: none; list-style: none; margin: 0; padding: 0; gap: 10px; }
.card { padding: 12px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 12px; display: grid; gap: 4px; overflow-wrap: anywhere; }
.card small { color: var(--texto-suave); }
.futuras { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.futuras li { display: flex; justify-content: space-between; gap: 12px; padding: 10px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; }
.pago { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; align-items: end; margin-top: 24px; }
.pago h2 { grid-column: 1 / -1; margin: 0; }
.pago input { width: 100%; }
@media (max-width: 639px) {
  .tabla-wrap { display: none; }
  .cards { display: grid; }
}
</style>
