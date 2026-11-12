// Después de cada deploy, los archivos de cada pantalla cambian de nombre. Una pestaña que quedó abierta
// con la versión anterior pide archivos que ya no existen y la navegación falla
// ("Failed to fetch dynamically imported module"). La salida es recargar una vez para traer la versión nueva;
// si vuelve a fallar enseguida, no se insiste, así nunca queda en un bucle de recargas.
const CLAVE = 'platita.recargaPorVersion'
const ESPERA_MS = 10_000

// Mensajes de Chrome/Edge, Safari y Firefox para un import dinámico que no se pudo cargar.
const MENSAJES = /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i

export function esArchivoViejo(error) {
  return MENSAJES.test(String(error?.message ?? ''))
}

export function recargarUnaVez(destino, { ahora = Date.now(), almacenamiento = globalThis.sessionStorage, ir = (url) => window.location.assign(url) } = {}) {
  let ultima = null
  try {
    const guardada = almacenamiento?.getItem(CLAVE)
    if (guardada) ultima = Number(guardada)
  } catch {
    // Almacenamiento bloqueado: se recarga igual.
  }
  if (ultima !== null && ahora - ultima < ESPERA_MS) return false
  try {
    almacenamiento?.setItem(CLAVE, String(ahora))
  } catch {
    // Sin almacenamiento no hay forma de recordar la recarga; se recarga igual.
  }
  ir(destino)
  return true
}
