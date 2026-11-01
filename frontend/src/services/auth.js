import { http } from './http.js'

export const registrar = (nombre, email, password) =>
  http.post('/auth/registro', { nombre, email, password })
export const login = (email, password) => http.post('/auth/login', { email, password })
export const restablecerPassword = (token, password) =>
  http.post('/auth/restablecer', { token, password })
export const logout = () => http.post('/auth/logout')
export const obtenerPerfil = () => http.get('/usuario/perfil')
