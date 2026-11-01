import { http } from './http.js'

export const listarCategorias = () => http.get('/categorias')
export const crearCategoria = (datos) => http.post('/categorias', datos)
export const editarCategoria = (id, datos) => http.patch(`/categorias/${id}`, datos)
export const archivarCategoria = (id) => http.delete(`/categorias/${id}`)
