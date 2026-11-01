import { reactive } from 'vue'

// Alertas flotantes de la app: se muestran arriba y se cierran solas o con su botón.
export const avisos = reactive({ lista: [] })

let siguiente = 0
const MAXIMO = 4

export function avisar(mensaje, tipo = 'exito', duracion = 3800) {
  const id = ++siguiente
  avisos.lista.push({ id, mensaje, tipo })
  if (avisos.lista.length > MAXIMO) avisos.lista.shift()
  setTimeout(() => cerrarAviso(id), duracion)
  return id
}

export function cerrarAviso(id) {
  const i = avisos.lista.findIndex((a) => a.id === id)
  if (i >= 0) avisos.lista.splice(i, 1)
}
