<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { registrar } from '../services/auth.js'
import { useSesion } from '../stores/sesion.js'

const router = useRouter()
const sesion = useSesion()
const nombre = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const enviando = ref(false)

async function enviar() {
  error.value = ''
  enviando.value = true
  try {
    await registrar(nombre.value, email.value, password.value)
    await sesion.iniciarSesion(email.value, password.value)
    await router.push('/')
  } catch (e) {
    error.value = e.mensaje || 'No se pudo crear la cuenta'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <main class="tarjeta-acceso">
    <h1>Crear cuenta</h1>
    <form @submit.prevent="enviar">
      <label>Nombre
        <input v-model="nombre" type="text" autocomplete="name" required />
      </label>
      <label>Email
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <label>Contraseña (mínimo 8 caracteres)
        <input v-model="password" type="password" autocomplete="new-password" minlength="8" required />
      </label>
      <p v-if="error" class="error-form" role="alert">{{ error }}</p>
      <button type="submit" :disabled="enviando">{{ enviando ? 'Creando...' : 'Crear cuenta' }}</button>
    </form>
    <p class="pie-acceso">¿Ya tenés cuenta? <RouterLink to="/login">Iniciá sesión</RouterLink></p>
  </main>
</template>
