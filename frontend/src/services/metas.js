import { http } from './http.js'

export const listarMetas = () => http.get('/metas')
// Una página de metas. La API responde { items, total, pagina, limite } cuando se pide paginación.
export const listarMetasPagina = (pagina, limite = 20) =>
  http.get(`/metas?pagina=${pagina}&limite=${limite}`)
export const crearMeta = (datos) => http.post('/metas', datos)
export const eliminarMeta = (id) => http.delete(`/metas/${id}`)
// monto negativo = retiro
export const registrarAporte = (id, datos) => http.post(`/metas/${id}/aportes`, datos)
