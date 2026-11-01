import { onMounted, onBeforeUnmount, watch } from 'vue'
import {
  Chart, BarController, BarElement, LineController, LineElement, PointElement,
  DoughnutController, ArcElement, CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js'

Chart.register(
  BarController, BarElement, LineController, LineElement, PointElement,
  DoughnutController, ArcElement, CategoryScale, LinearScale, Tooltip, Legend
)

// Lee un token CSS (var(--...)) en runtime; los colores nunca se escriben a mano.
export function color(token) {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return valor || 'currentColor'
}

export const colorSerie = (i) => color(`--grafico-${(i % 8) + 1}`)

// Solo para la escala del eje: los totales y textos usan siempre el string de la API.
export const paraEje = (monto) => Number(monto)

export function opcionesBase({ ejes = true } = {}) {
  const texto = color('--texto')
  const borde = color('--borde')
  const opciones = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: texto } } }
  }
  if (ejes) {
    opciones.scales = {
      x: { ticks: { color: texto }, grid: { color: borde } },
      y: { ticks: { color: texto }, grid: { color: borde } }
    }
  }
  return opciones
}

// Crea el gráfico al montar y lo reconstruye cuando cambian los datos.
export function useGrafico(canvas, fuente, construir) {
  let grafico = null
  const dibujar = () => {
    if (grafico) grafico.destroy()
    grafico = canvas.value ? new Chart(canvas.value, construir()) : null
  }
  onMounted(dibujar)
  watch(fuente, dibujar, { deep: true })
  onBeforeUnmount(() => {
    if (grafico) grafico.destroy()
    grafico = null
  })
}
