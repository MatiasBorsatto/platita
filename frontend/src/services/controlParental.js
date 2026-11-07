import { http } from './http.js'

export const listarMenores = () => http.get('/control-parental/menores')
export const vincularMenor = (grupoId, email) => http.post('/control-parental/vinculos', { grupoId, email })
export const cambiarPermisos = (menorId, grupoId, permisos) =>
  http.patch(`/control-parental/menores/${menorId}/permisos`, { grupoId, permisos })
export const desvincularMenor = (menorId, grupoId) =>
  http.delete(`/control-parental/menores/${menorId}?grupoId=${encodeURIComponent(grupoId)}`)
export const actividadDelMenor = (menorId) => http.get(`/control-parental/menores/${menorId}/actividad`)
