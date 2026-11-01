import { http } from './http.js'

export const listarNotificaciones = () => http.get('/notificaciones')
export const marcarLeida = (id) => http.patch(`/notificaciones/${id}/leida`)
