<script setup>
import { formatearMonto } from '../utils/formato.js'

const props = defineProps({
  gastos: { type: Array, required: true },
  miembros: { type: Array, default: () => [] }, // [{ usuarioId, nombre }]
  usuarioId: { type: String, default: null }
})
defineEmits(['editar', 'eliminar'])

const nombreDe = (uid) => props.miembros.find((m) => m.usuarioId === uid)?.nombre ?? 'Alguien'
const titulo = (g) => g.descripcion || 'Gasto sin descripción'
</script>

<template>
  <div>
    <p v-if="gastos.length === 0">Todavía no hay gastos compartidos.</p>
    <ul v-else class="lista">
      <li v-for="g in gastos" :key="g.id" class="fila" data-gasto>
        <span class="datos">
          <strong>{{ titulo(g) }}</strong>
          <small>{{ g.fecha }} · Pagó {{ nombreDe(g.pagadorId) }}</small>
        </span>
        <span class="monto">{{ formatearMonto(g.monto) }}</span>
        <span v-if="g.usuarioId === usuarioId" class="acciones">
          <button type="button" :aria-label="`Editar gasto ${titulo(g)}`" @click="$emit('editar', g)">Editar</button>
          <button type="button" :aria-label="`Eliminar gasto ${titulo(g)}`" @click="$emit('eliminar', g)">Eliminar</button>
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.lista { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.fila { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; }
.datos { display: grid; min-width: 0; overflow-wrap: anywhere; }
.datos small { color: var(--texto-suave); }
.acciones { display: flex; gap: 8px; flex-wrap: wrap; }
button { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; }
</style>
