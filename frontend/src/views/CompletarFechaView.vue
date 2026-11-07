<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { actualizarPerfil } from '../services/usuario.js'
import { useSesion } from '../stores/sesion.js'

// Pantalla obligatoria: sin fecha de nacimiento no se puede usar la app.
const router = useRouter()
const sesion = useSesion()
const fechaNacimiento = ref('')
const hoy = new Date().toISOString().slice(0, 10)
const error = ref('')
const enviando = ref(false)

async function guardar() {
  error.value = ''
  enviando.value = true
  try {
    await actualizarPerfil({ fechaNacimiento: fechaNacimiento.value })
    await sesion.cargarSesion()
    await router.push('/')
  } catch (e) {
    error.value = e.mensaje || 'No se pudo guardar la fecha'
  } finally {
    enviando.value = false
  }
}

async function salir() {
  await sesion.cerrarSesion()
  await router.push('/login')
}
</script>

<template>
  <main class="tarjeta-acceso">
    <h1>Completá tu fecha de nacimiento</h1>
    <p class="pie-acceso">Es obligatoria para usar la aplicación y se carga una sola vez.</p>
    <form @submit.prevent="guardar">
      <label>Fecha de nacimiento
        <input v-model="fechaNacimiento" type="date" autocomplete="bday" :max="hoy" required />
      </label>
      <p v-if="error" class="error-form" role="alert">{{ error }}</p>
      <button type="submit" :disabled="enviando">{{ enviando ? 'Guardando...' : 'Guardar y continuar' }}</button>
    </form>
    <p class="pie-acceso"><button type="button" class="secundario" @click="salir">Salir</button></p>
  </main>
</template>
