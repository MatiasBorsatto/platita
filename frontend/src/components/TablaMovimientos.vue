<script setup>
import { formatearMonto } from '../utils/formato.js'

const props = defineProps({
  movimientos: { type: Array, default: () => [] },
  categorias: { type: Array, default: () => [] }
})
const emit = defineEmits(['editar', 'eliminar'])

function nombreCategoria(id) {
  return props.categorias.find((c) => c.id === id)?.nombre ?? 'Sin categoría'
}
function fechaLegible(fecha) {
  const [a, m, d] = String(fecha).split('-')
  return `${d}/${m}/${a}`
}
function signo(m) {
  return m.tipo === 'ingreso' ? '+' : '-'
}
</script>

<template>
  <p v-if="!movimientos.length" class="vacio">No hay movimientos para mostrar.</p>
  <template v-else>
    <div class="envoltorio-tabla">
      <table class="tabla">
        <thead>
          <tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th class="num">Monto</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          <tr v-for="m in movimientos" :key="m.id">
            <td>{{ fechaLegible(m.fecha) }}</td>
            <td>{{ m.descripcion || '—' }}</td>
            <td>{{ nombreCategoria(m.categoriaId) }}</td>
            <td class="num" :class="m.tipo">{{ signo(m) }}{{ formatearMonto(m.monto) }}</td>
            <td class="acciones">
              <button type="button" @click="emit('editar', m)">Editar</button>
              <button type="button" @click="emit('eliminar', m)">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <ul class="tarjetas">
      <li v-for="m in movimientos" :key="m.id" class="tarjeta">
        <div class="fila"><span>{{ fechaLegible(m.fecha) }}</span><strong :class="m.tipo">{{ signo(m) }}{{ formatearMonto(m.monto) }}</strong></div>
        <div>{{ m.descripcion || '—' }}</div>
        <div class="suave">{{ nombreCategoria(m.categoriaId) }}</div>
        <div class="acciones">
          <button type="button" @click="emit('editar', m)">Editar</button>
          <button type="button" @click="emit('eliminar', m)">Eliminar</button>
        </div>
      </li>
    </ul>
  </template>
</template>

<style scoped>
.envoltorio-tabla { overflow-x: auto; background: var(--superficie); border: 1px solid var(--borde); border-radius: 12px; }
.tabla { width: 100%; border-collapse: collapse; }
.tabla th, .tabla td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--borde); }
.num { text-align: right !important; white-space: nowrap; }
.gasto { color: var(--error); }
.ingreso { color: var(--primario); }
.acciones { display: flex; gap: 8px; }
button { padding: 6px 12px; border-radius: 8px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); cursor: pointer; }
.tarjetas { display: none; list-style: none; margin: 0; padding: 0; gap: 10px; }
.tarjeta { padding: 14px; background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio-chico); box-shadow: var(--sombra); display: grid; gap: 6px; overflow-wrap: anywhere; }
.fila { display: flex; justify-content: space-between; gap: 8px; }
.suave { color: var(--texto-suave); font-size: 0.9rem; }
.vacio { color: var(--texto-suave); }
@media (max-width: 639px) {
  .envoltorio-tabla { display: none; }
  .tarjetas { display: grid; }
}
</style>
