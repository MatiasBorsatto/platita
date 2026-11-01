import { defineStore } from 'pinia'
import * as authApi from '../services/auth.js'

export const useSesion = defineStore('sesion', {
  state: () => ({ usuario: null, cargada: false }),
  actions: {
    async cargarSesion() {
      try {
        this.usuario = await authApi.obtenerPerfil()
      } catch {
        this.usuario = null
      } finally {
        this.cargada = true
      }
    },
    async iniciarSesion(email, password) {
      await authApi.login(email, password)
      await this.cargarSesion()
    },
    async cerrarSesion() {
      try {
        await authApi.logout()
      } finally {
        this.usuario = null
      }
    }
  }
})
