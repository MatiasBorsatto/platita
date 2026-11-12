import { http } from './http.js'

export const listarGrupos = () => http.get('/grupos')
export const crearGrupo = (nombre) => http.post('/grupos', { nombre })
export const obtenerGrupo = (id) => http.get(`/grupos/${id}`)
export const unirseAGrupo = (codigo) => http.post('/grupos/unirse', { codigo })
export const regenerarCodigo = (id) => http.post(`/grupos/${id}/codigo/regenerar`)
export const quitarMiembro = (id, usuarioId) => http.delete(`/grupos/${id}/miembros/${usuarioId}`)
export const cambiarRol = (id, usuarioId, rol) => http.patch(`/grupos/${id}/miembros/${usuarioId}`, { rol })
export const salirDeGrupo = (id) => http.post(`/grupos/${id}/salir`)
export const invitar = (id, email) => http.post(`/grupos/${id}/invitaciones`, { email })
export const aceptarInvitacion = (token) => http.post('/invitaciones/aceptar', { token })
export const crearGastoCompartido = (id, datos) => http.post(`/grupos/${id}/gastos`, datos)
export const listarGastosCompartidos = (id) => http.get(`/grupos/${id}/gastos?limit=100`)
export const editarGastoCompartido = (id, gastoId, datos) => http.patch(`/grupos/${id}/gastos/${gastoId}`, datos)
export const eliminarGastoCompartido = (id, gastoId) => http.delete(`/grupos/${id}/gastos/${gastoId}`)
export const registrarAporte = (id, gastoId, datos) =>
  http.post(`/grupos/${id}/gastos/${gastoId}/aportes`, datos)
export const eliminarAporte = (id, gastoId, aporteId) =>
  http.delete(`/grupos/${id}/gastos/${gastoId}/aportes/${aporteId}`)
export const listarSaldos = (id) => http.get(`/grupos/${id}/saldos`)
export const registrarPago = (id, datos) => http.post(`/grupos/${id}/pagos`, datos)
export const listarPagos = (id) => http.get(`/grupos/${id}/pagos`)
// Saldo de cada miembro al cierre de cada mes (gráfico del detalle del grupo).
export const saldosHistoricos = (id, { desde, hasta, moneda = 'ARS' }) =>
  http.get(`/grupos/${id}/saldos/historico?desde=${desde}&hasta=${hasta}&moneda=${moneda}`)
