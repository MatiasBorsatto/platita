import { http } from './http.js'

export const listarMetas = () => http.get('/metas')
export const crearMeta = (datos) => http.post('/metas', datos)
export const eliminarMeta = (id) => http.delete(`/metas/${id}`)
// monto negativo = retiro
export const registrarAporte = (id, datos) => http.post(`/metas/${id}/aportes`, datos)
