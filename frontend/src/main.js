import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { crearRouter } from './router/index.js'
import './styles/tokens.css'
import './style.css'
import { aplicarPreferenciaAnimaciones } from './motion/movimiento.js'

aplicarPreferenciaAnimaciones()
// En modo 'sistema', seguir el cambio de la configuración del sistema operativo sin recargar.
window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', aplicarPreferenciaAnimaciones)

const app = createApp(App)
app.use(createPinia())
app.use(crearRouter())
app.mount('#app')
