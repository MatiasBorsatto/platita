import { http } from './http.js'

export function listarMovimientos(filtros = {}) {
  const params = new URLSearchParams()
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== '') params.set(clave, valor)
  }
  const consulta = params.toString()
  return http.get(`/movimientos${consulta ? `?${consulta}` : ''}`)
}
export const crearMovimiento = (datos) => http.post('/movimientos', datos)
export const editarMovimiento = (id, datos) => http.patch(`/movimientos/${id}`, datos)
export const eliminarMovimiento = (id) => http.delete(`/movimientos/${id}`)
export const listarCategorias = () => http.get('/categorias')
