<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { animate } from 'motion'
import { reducido } from '../motion/movimiento.js'

// Iconos decorativos de fondo: flotan despacio y no reciben foco ni lectura de pantalla.
// Trazos SVG de 24x24, mismo estilo de línea que la barra lateral.
const trazos = {
  moneda: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M12 7.5v9', 'M14.5 9.5c-.4-.7-1.2-1-2.5-1-1.5 0-2.5.7-2.5 1.7s1 1.5 2.5 1.8 2.5.8 2.5 1.8-1 1.7-2.5 1.7c-1.3 0-2.2-.4-2.6-1.1'],
  billete: ['M2 6h20v12H2z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6', 'M5 9.5h.01', 'M19 14.5h.01'],
  grafico: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  cartera: ['M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3z', 'M3 7V5a2 2 0 0 1 2-2h11', 'M16 13.5h.01'],
  objetivo: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2'],
  tarjeta: ['M3 6h18v12H3z', 'M3 10h18', 'M7 15h4']
}

// Posición en porcentaje del área de contenido, tamaño en px y velocidad de flotación.
const piezas = [
  { icono: 'moneda', x: '80%', y: '16%', tam: 44, duracion: 6.5 },
  { icono: 'billete', x: '84%', y: '8%', tam: 52, duracion: 7.5 },
  { icono: 'grafico', x: '90%', y: '60%', tam: 40, duracion: 6 },
  { icono: 'cartera', x: '77%', y: '82%', tam: 46, duracion: 8 },
  { icono: 'objetivo', x: '88%', y: '90%', tam: 36, duracion: 7 },
  { icono: 'tarjeta', x: '75%', y: '38%', tam: 40, duracion: 6.8 }
]

const raiz = ref(null)
const controles = []

onMounted(() => {
  if (reducido()) return
  raiz.value.querySelectorAll('.flotante').forEach((el, i) => {
    const d = piezas[i].duracion
    controles.push(
      animate(
        el,
        {
          transform: ['translateY(0px) rotate(0deg)', 'translateY(-16px) rotate(7deg)', 'translateY(0px) rotate(0deg)'],
          opacity: [0.14, 0.3, 0.14]
        },
        { duration: d, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }
      )
    )
  })
})

onBeforeUnmount(() => controles.forEach((c) => c.stop()))
</script>

<template>
  <div ref="raiz" class="fondo-flotante" aria-hidden="true">
    <svg
      v-for="(p, i) in piezas"
      :key="i"
      class="flotante"
      viewBox="0 0 24 24"
      :style="{ left: p.x, top: p.y, width: `${p.tam}px`, height: `${p.tam}px` }"
    >
      <path v-for="d in trazos[p.icono]" :key="d" :d="d" />
    </svg>
  </div>
</template>

<style scoped>
.fondo-flotante { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: -1; }
.flotante {
  position: absolute; fill: none; stroke: var(--primario); stroke-width: 1.4;
  stroke-linecap: round; stroke-linejoin: round; opacity: 0.6;
}
.flotante:nth-child(even) { stroke: var(--acento); }
@media (max-width: 767px) { .flotante:nth-child(n + 5) { display: none; } }
</style>
