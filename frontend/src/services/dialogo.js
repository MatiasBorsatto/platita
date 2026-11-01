import { reactive } from 'vue'

// Estado único del diálogo de confirmación. Lo lee DialogoConfirmacion.vue, montado una vez en App.vue.
export const dialogo = reactive({
  abierto: false,
  titulo: '',
  mensaje: '',
  aceptar: 'Confirmar',
  cancelar: 'Cancelar',
  peligroso: false,
  resolver: null
})

// Muestra el diálogo y devuelve una promesa que se resuelve con true (aceptar) o false (cancelar).
export function confirmar(mensaje, opciones = {}) {
  // Si ya hay un diálogo abierto, el nuevo cancela al anterior para no dejar promesas colgadas.
  dialogo.resolver?.(false)
  return new Promise((resolve) => {
    dialogo.titulo = opciones.titulo ?? 'Confirmar acción'
    dialogo.mensaje = mensaje
    dialogo.aceptar = opciones.aceptar ?? 'Confirmar'
    dialogo.cancelar = opciones.cancelar ?? 'Cancelar'
    dialogo.peligroso = opciones.peligroso ?? false
    dialogo.resolver = resolve
    dialogo.abierto = true
  })
}

export function responder(valor) {
  const resolver = dialogo.resolver
  dialogo.abierto = false
  dialogo.resolver = null
  resolver?.(valor)
}
