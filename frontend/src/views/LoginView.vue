<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSesion } from '../stores/sesion.js'

const router = useRouter()
const sesion = useSesion()
const email = ref('')
const password = ref('')
const error = ref('')
const enviando = ref(false)

async function enviar() {
  error.value = ''
  enviando.value = true
  try {
    await sesion.iniciarSesion(email.value, password.value)
    const destino = router.currentRoute?.value?.query?.redirect
    await router.push(typeof destino === 'string' && /^\/(?!\/)/.test(destino) ? destino : '/')
  } catch (e) {
    error.value = e.mensaje || 'No se pudo iniciar sesión'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <main class="tarjeta-acceso">
    <h1>Iniciar sesión</h1>
    <form @submit.prevent="enviar">
      <label>Email
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <label>Contraseña
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <p v-if="error" class="error-form" role="alert">{{ error }}</p>
      <button type="submit" :disabled="enviando">{{ enviando ? 'Ingresando...' : 'Ingresar' }}</button>
    </form>
    <p class="pie-acceso">¿No tenés cuenta? <RouterLink to="/registro">Registrate</RouterLink></p>
  </main>
</template>
