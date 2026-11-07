import { http } from './http.js'

export const listarDeudas = () => http.get('/deudas')
