<script setup>
import { computed } from 'vue'
import { formatearMonto, aCentavos, deCentavos } from '../utils/formato.js'

const props = defineProps({
  gastos: { type: Array, required: true },
  miembros: { type: Array, default: () => [] }, // [{ usuarioId, nombre }]
  usuarioId: { type: String, default: null },
  esAdmin: { type: Boolean, default: false }
})
const emit = defineEmits(['editar', 'eliminar', 'registrar-aporte', 'eliminar-aporte'])

const nombreDe = (uid) => props.miembros.find((m) => m.usuarioId === uid)?.nombre ?? 'Alguien'
const titulo = (g) => g.descripcion || 'Gasto sin descripción'

function totalAportado(g) {
  if (g.totalAportado !== undefined && g.totalAportado !== null) return g.totalAportado
  const suma = (g.aportes || []).reduce((acc, a) => acc + aCentavos(a.monto), 0n)
  return deCentavos(suma)
}

function falta(g) {
  if (g.faltaCubrir !== undefined && g.faltaCubrir !== null) return g.faltaCubrir
  const f = aCentavos(g.monto) - aCentavos(totalAportado(g))
  return f > 0n ? deCentavos(f) : '0.00'
}

function puedeBorrarAporte(g, a) {
  if (g.usuarioId === props.usuarioId) return true
  return a.usuarioId === props.usuarioId
}

function puedeAgregar(g) {
  if (g.usuarioId === props.usuarioId) return true
  // Cualquier miembro puede agregar su propio aporte
  return !!props.miembros.find((m) => m.usuarioId === props.usuarioId)
}
</script>

<template>
  <div>
    <p v-if="gastos.length === 0">Todavía no hay gastos compartidos.</p>
    <ul v-else class="lista">
      <li v-for="g in gastos" :key="g.id" class="item" data-gasto>
        <div class="cabecera">
          <div class="datos">
            <strong>{{ titulo(g) }}</strong>
            <small>{{ g.fecha }} · Total {{ formatearMonto(g.monto) }}<template v-if="g.pagadorId"> · Pagó {{ nombreDe(g.pagadorId) }}</template></small>
          </div>
          <span v-if="g.usuarioId === usuarioId" class="acciones">
            <button type="button" :aria-label="`Editar gasto ${titulo(g)}`" @click="emit('editar', g)">Editar</button>
            <button type="button" :aria-label="`Eliminar gasto ${titulo(g)}`" @click="emit('eliminar', g)">Eliminar</button>
          </span>
        </div>

        <div class="resumen">
          <span>Aportado: <strong>{{ formatearMonto(totalAportado(g)) }}</strong></span>
          <span>Falta cubrir: <strong>{{ formatearMonto(falta(g)) }}</strong></span>
        </div>

        <div v-if="g.participaciones && g.participaciones.length" class="participaciones">
          <div class="fila-part">
            <span>Integrante</span>
            <span>Le corresponde</span>
          </div>
          <div v-for="p in g.participaciones" :key="p.usuarioId" class="fila-part">
            <span>{{ nombreDe(p.usuarioId) }}</span>
            <span>{{ formatearMonto(p.monto) }}</span>
          </div>
        </div>

        <div class="aportes">
          <h4>Aportes reales</h4>
          <p v-if="!g.aportes || !g.aportes.length" class="suave">Sin aportes registrados.</p>
          <ul v-else class="lista-aportes">
            <li v-for="a in g.aportes" :key="a.id">
              <span>{{ nombreDe(a.usuarioId) }} · {{ formatearMonto(a.monto) }} · {{ a.fecha }}</span>
              <button v-if="puedeBorrarAporte(g, a)" type="button" @click="emit('eliminar-aporte', { gasto: g, aporte: a })">Borrar</button>
            </li>
          </ul>
          <div v-if="puedeAgregar(g)" class="agregar-aporte">
            <button type="button" @click="emit('registrar-aporte', g)">Registrar aporte</button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.lista { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.item { padding: 14px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 10px; display: grid; gap: 12px; }
.cabecera { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.datos { display: grid; min-width: 0; overflow-wrap: anywhere; }
.datos small { color: var(--texto-suave); }
.acciones { display: flex; gap: 8px; flex-wrap: wrap; }
.resumen { display: flex; gap: 16px; flex-wrap: wrap; color: var(--texto-suave); }
.resumen strong { color: var(--texto); }
.participaciones { display: grid; gap: 6px; }
.fila-part { display: grid; grid-template-columns: 1fr 1fr; padding: 6px 0; border-bottom: 1px solid var(--borde); }
.fila-part:first-child { color: var(--texto-suave); font-size: 0.9rem; }
.aportes h4 { margin: 0; font-size: 0.98rem; }
.lista-aportes { list-style: none; padding: 0; margin: 8px 0; display: grid; gap: 6px; }
.lista-aportes li { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 10px; background: var(--superficie-elevada); border: 1px solid var(--borde); border-radius: 8px; }
.suave { color: var(--texto-suave); }
button { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; }
@media (max-width: 639px) {
  .fila-part { grid-template-columns: 1fr; }
}
</style>
