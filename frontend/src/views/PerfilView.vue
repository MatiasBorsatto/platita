<script setup>
import CargandoIndicador from '../components/CargandoIndicador.vue'
import { ref, onMounted } from 'vue'
import { useSesion } from '../stores/sesion.js'
import { obtenerPerfil, actualizarPerfil } from '../services/usuario.js'

const sesion = useSesion()
const perfil = ref(null)
const nombre = ref('')
const email = ref('')
const preferenciasEmail = ref(false)
const passwordActual = ref('')
const passwordNueva = ref('')
const passwordConfirmacion = ref('')
const cargando = ref(true)
const errorCarga = ref('')
const mensajes = ref({ datos: '', password: '', avisos: '' })
const errores = ref({ datos: '', password: '', avisos: '' })
const enviando = ref('')

function aplicar(p) {
  perfil.value = p
  nombre.value = p.nombre
  email.value = p.email
  preferenciasEmail.value = !!p.preferenciasEmail
  if (sesion.usuario) sesion.usuario = { ...sesion.usuario, ...p }
}

function limpiar(seccion) {
  mensajes.value[seccion] = ''
  errores.value[seccion] = ''
}

async function guardar(seccion, cambios, exito) {
  limpiar(seccion)
  enviando.value = seccion
  try {
    const p = await actualizarPerfil(cambios)
    aplicar(p)
    mensajes.value[seccion] = exito
    return true
  } catch (e) {
    errores.value[seccion] = e.mensaje || e.message || 'No se pudo guardar'
    return false
  } finally {
    enviando.value = ''
  }
}

async function guardarDatos() {
  limpiar('datos')
  const cambios = {}
  if (nombre.value.trim() !== perfil.value.nombre) cambios.nombre = nombre.value.trim()
  if (email.value.trim().toLowerCase() !== perfil.value.email) cambios.email = email.value.trim()
  if (!Object.keys(cambios).length) {
    mensajes.value.datos = 'No hay cambios para guardar'
    return
  }
  await guardar('datos', cambios, 'Datos actualizados')
}

async function guardarPassword() {
  limpiar('password')
  if (passwordNueva.value !== passwordConfirmacion.value) {
    errores.value.password = 'Las contraseñas no coinciden'
    return
  }
  const ok = await guardar(
    'password',
    { passwordActual: passwordActual.value, passwordNueva: passwordNueva.value },
    'Contraseña actualizada'
  )
  if (ok) {
    passwordActual.value = ''
    passwordNueva.value = ''
    passwordConfirmacion.value = ''
  }
}

async function cambiarAvisos() {
  const deseado = preferenciasEmail.value
  const ok = await guardar('avisos', { preferenciasEmail: deseado }, 'Preferencia guardada')
  if (!ok) preferenciasEmail.value = !deseado
}

onMounted(async () => {
  try {
    aplicar(await obtenerPerfil())
  } catch (e) {
    errorCarga.value = e.mensaje || e.message || 'No se pudo cargar el perfil'
  } finally {
    cargando.value = false
  }
})
</script>

<template>
  <section class="perfil">
    <h1>Mi perfil</h1>
    <CargandoIndicador v-if="cargando" />
    <p v-else-if="errorCarga" class="error-form" role="alert">{{ errorCarga }}</p>
    <template v-else-if="perfil">
      <p class="resumen">{{ perfil.nombre }} · {{ perfil.email }}</p>

      <section aria-labelledby="titulo-avisos">
        <h2 id="titulo-avisos">Avisos</h2>
        <label class="opcion">
          <input
            v-model="preferenciasEmail"
            type="checkbox"
            name="preferenciasEmail"
            :disabled="enviando === 'avisos'"
            @change="cambiarAvisos"
          />
          Recibir avisos por email cuando un presupuesto supera el 80% o el 100%
        </label>
        <p v-if="mensajes.avisos" role="status">{{ mensajes.avisos }}</p>
        <p v-if="errores.avisos" class="error-form" role="alert">{{ errores.avisos }}</p>
      </section>

      <section aria-labelledby="titulo-datos">
        <h2 id="titulo-datos">Datos personales</h2>
        <form class="panel" aria-label="Datos personales" @submit.prevent="guardarDatos">
          <label>Nombre
            <input v-model="nombre" name="nombre" type="text" autocomplete="name" required />
          </label>
          <label>Email
            <input v-model="email" name="email" type="email" autocomplete="email" required />
          </label>
          <p v-if="mensajes.datos" role="status">{{ mensajes.datos }}</p>
          <p v-if="errores.datos" class="error-form" role="alert">{{ errores.datos }}</p>
          <button type="submit" :disabled="enviando === 'datos'">Guardar datos</button>
        </form>
      </section>

      <section aria-labelledby="titulo-password">
        <h2 id="titulo-password">Contraseña</h2>
        <form class="panel" aria-label="Cambiar contraseña" @submit.prevent="guardarPassword">
          <label>Contraseña actual
            <input v-model="passwordActual" name="passwordActual" type="password" autocomplete="current-password" required />
          </label>
          <label>Nueva contraseña
            <input v-model="passwordNueva" name="passwordNueva" type="password" autocomplete="new-password" minlength="8" required />
          </label>
          <label>Repetí la nueva contraseña
            <input v-model="passwordConfirmacion" name="passwordConfirmacion" type="password" autocomplete="new-password" minlength="8" required />
          </label>
          <p v-if="mensajes.password" role="status">{{ mensajes.password }}</p>
          <p v-if="errores.password" class="error-form" role="alert">{{ errores.password }}</p>
          <button type="submit" :disabled="enviando === 'password'">Cambiar contraseña</button>
        </form>
      </section>
    </template>
  </section>
</template>

<style scoped>
.perfil { max-width: 520px; }
.perfil section { margin-bottom: 24px; }
.perfil form label { display: block; margin-bottom: 12px; }
.perfil form input { display: block; width: 100%; }
.opcion {
  display: flex; gap: 12px; align-items: center; max-width: 560px; padding: 14px 16px; cursor: pointer;
  background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio-chico);
}
.opcion input { flex: none; margin: 0; }
.resumen { color: var(--texto-suave); }
</style>
