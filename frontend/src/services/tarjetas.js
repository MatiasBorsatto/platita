import { http } from './http.js'

export const listarTarjetas = () => http.get('/tarjetas')
export const crearTarjeta = (datos) => http.post('/tarjetas', datos)
export const editarTarjeta = (id, datos) => http.patch(`/tarjetas/${id}`, datos)
export const eliminarTarjeta = (id) => http.delete(`/tarjetas/${id}`)
export const crearCompra = (id, datos) => http.post(`/tarjetas/${id}/compras`, datos)
export const resumenTarjeta = (id, mes) => http.get(`/tarjetas/${id}/resumen?mes=${encodeURIComponent(mes)}`)
export const registrarPago = (id, datos) => http.post(`/tarjetas/${id}/pagos`, datos)
