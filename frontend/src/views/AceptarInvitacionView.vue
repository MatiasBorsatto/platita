<script setup>
import CargandoIndicador from '../components/CargandoIndicador.vue'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { aceptarInvitacion } from '../services/grupos.js'

const route = useRoute()
const router = useRouter()
const estado = ref('cargando')
const error = ref('')

onMounted(async () => {
  const token = route.query.token
  if (typeof token !== 'string' || !token) {
    estado.value = 'error'
    error.value = 'El enlace de invitación no es válido.'
    return
  }
  try {
    const grupo = await aceptarInvitacion(token)
    await router.replace(`/grupos/${grupo.id}`)
  } catch (e) {
    estado.value = 'error'
    error.value = e.mensaje || 'No se pudo aceptar la invitación.'
  }
})
</script>

<template>
  <section>
    <h1>Invitación a un grupo</h1>
    <CargandoIndicador v-if="estado === 'cargando'" texto="Aceptando la invitación" />
    <template v-else>
      <div class="error-form" role="alert">{{ error }}</div>
      <RouterLink to="/grupos">Ir a mis grupos</RouterLink>
    </template>
  </section>
</template>

<style scoped>
h1 { font-size: 1.5rem; margin-top: 0; }
.error-form { padding: 10px; margin-bottom: 12px; border-radius: 8px; background: var(--error-fondo); color: var(--error); }
</style>
