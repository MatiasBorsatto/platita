import { http } from './http.js'

export const listarGastosFijos = () => http.get('/gastos-fijos')
export const crearGastoFijo = (datos) => http.post('/gastos-fijos', datos)
export const obtenerGastoFijo = (id, mes) =>
  http.get(`/gastos-fijos/${id}${mes ? `?mes=${encodeURIComponent(mes)}` : ''}`)
export const editarGastoFijo = (id, datos) => http.patch(`/gastos-fijos/${id}`, datos)
export const eliminarGastoFijo = (id) => http.delete(`/gastos-fijos/${id}`)

export const crearConcepto = (id, datos) => http.post(`/gastos-fijos/${id}/conceptos`, datos)
export const editarConcepto = (id, conceptoId, datos) =>
  http.patch(`/gastos-fijos/${id}/conceptos/${conceptoId}`, datos)
export const eliminarConcepto = (id, conceptoId) =>
  http.delete(`/gastos-fijos/${id}/conceptos/${conceptoId}`)

export const listarVencimientos = (mes) =>
  http.get(`/gastos-fijos/vencimientos?mes=${encodeURIComponent(mes)}`)
export const listarRecordatorios = () => http.get('/gastos-fijos/recordatorios')

export const pagarCuota = (id, cuotaId, datos = {}) =>
  http.post(`/gastos-fijos/${id}/cuotas/${cuotaId}/pagar`, datos)
export const deshacerPago = (id, cuotaId) =>
  http.post(`/gastos-fijos/${id}/cuotas/${cuotaId}/deshacer-pago`, {})
