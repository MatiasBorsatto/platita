import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { crearRouter } from './router/index.js'
import './styles/tokens.css'
import './style.css'
import { aplicarPreferenciaAnimaciones } from './motion/movimiento.js'
import { configurarSesion } from './services/http.js'
import { useSesion } from './stores/sesion.js'

aplicarPreferenciaAnimaciones()
// En modo 'sistema', seguir el cambio de la configuración del sistema operativo sin recargar.
window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', aplicarPreferenciaAnimaciones)

const app = createApp(App)
app.use(createPinia())
const router = crearRouter()
app.use(router)

// Sesión vencida: si había alguien conectado, se lo lleva al login y después vuelve a donde estaba.
configurarSesion({
  alExpirar() {
    const sesion = useSesion()
    if (!sesion.usuario) return
    sesion.usuario = null
    const actual = router.currentRoute.value
    if (actual.path !== '/login') router.push({ path: '/login', query: { redirect: actual.fullPath, motivo: 'expirada' } })
  },
  alFaltarFecha() {
    if (router.currentRoute.value.path !== '/completar-fecha') router.push('/completar-fecha')
  }
})

app.mount('#app')
