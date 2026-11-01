import { http } from './http.js'

export const listarPresupuestos = (mes) => http.get(`/presupuestos?mes=${encodeURIComponent(mes)}`)
export const estadoPresupuestos = (mes) => http.get(`/presupuestos/estado?mes=${encodeURIComponent(mes)}`)
export const guardarPresupuesto = (datos) => http.put('/presupuestos', datos)
export const eliminarPresupuesto = (id) => http.delete(`/presupuestos/${id}`)
