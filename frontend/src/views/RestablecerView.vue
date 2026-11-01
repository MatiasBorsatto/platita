<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { restablecerPassword } from '../services/auth.js'

const route = useRoute()
const token = typeof route.query?.token === 'string' ? route.query.token : ''
const password = ref('')
const confirmacion = ref('')
const error = ref('')
const listo = ref(false)
const enviando = ref(false)

async function enviar() {
  error.value = ''
  if (password.value !== confirmacion.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }
  enviando.value = true
  try {
    await restablecerPassword(token, password.value)
    listo.value = true
  } catch (e) {
    error.value = e.mensaje || 'No se pudo restablecer la contraseña'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <main class="tarjeta-acceso">
    <h1>Restablecer contraseña</h1>
    <p v-if="!token" class="error-form" role="alert">
      El enlace es inválido o venció. Pedí uno nuevo desde tu perfil.
    </p>
    <template v-else-if="listo">
      <p role="status">Contraseña actualizada. Ya podés iniciar sesión.</p>
      <p class="pie-acceso"><RouterLink to="/login">Ir a iniciar sesión</RouterLink></p>
    </template>
    <form v-else @submit.prevent="enviar">
      <label>Nueva contraseña
        <input v-model="password" type="password" autocomplete="new-password" required />
      </label>
      <label>Repetí la contraseña
        <input v-model="confirmacion" type="password" autocomplete="new-password" required />
      </label>
      <p v-if="error" class="error-form" role="alert">{{ error }}</p>
      <button type="submit" :disabled="enviando">{{ enviando ? 'Guardando...' : 'Guardar contraseña' }}</button>
    </form>
  </main>
</template>
