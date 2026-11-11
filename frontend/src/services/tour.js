import { reactive } from 'vue'
import { PASOS } from '../tour/pasos.js'

// Estado único del tour guiado. Lo usan el tour, el botón de ayuda y el layout.
export const tour = reactive({ activo: false, indice: 0 })

const clave = (usuarioId) => `platita.tour.visto.${usuarioId ?? 'anonimo'}`

// localStorage puede no existir o fallar (modo privado): el tour sigue funcionando igual.
export function tourVisto(usuarioId) {
  try {
    return localStorage.getItem(clave(usuarioId)) === '1'
  } catch {
    return false
  }
}

export function marcarTourVisto(usuarioId) {
  try {
    localStorage.setItem(clave(usuarioId), '1')
  } catch {
    // Sin almacenamiento, el tour se vuelve a ofrecer en el próximo ingreso.
  }
}

export function iniciarTour(indice = 0) {
  tour.indice = indice
  tour.activo = true
}

export function terminarTour() {
  tour.activo = false
}

export function siguientePaso() {
  if (tour.indice < PASOS.length - 1) tour.indice += 1
  else terminarTour()
}

export function pasoAnterior() {
  if (tour.indice > 0) tour.indice -= 1
}

export function irAPaso(indice) {
  if (indice >= 0 && indice < PASOS.length) tour.indice = indice
}
