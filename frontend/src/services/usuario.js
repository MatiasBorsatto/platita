import { http } from './http.js'

export const obtenerPerfil = () => http.get('/usuario/perfil')
export const actualizarPerfil = (cambios) => http.patch('/usuario/perfil', cambios)
