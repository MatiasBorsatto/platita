import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import { useSesion } from '../stores/sesion.js'
import LoginView from '../views/LoginView.vue'
import RegistroView from '../views/RegistroView.vue'
import MovimientosView from '../views/MovimientosView.vue'
import PresupuestosView from '../views/PresupuestosView.vue'
import TarjetasView from '../views/TarjetasView.vue'
import MetasView from '../views/MetasView.vue'
import GruposView from '../views/GruposView.vue'
import GrupoDetalleView from '../views/GrupoDetalleView.vue'
import AceptarInvitacionView from '../views/AceptarInvitacionView.vue'
import EstadisticasView from '../views/EstadisticasView.vue'
import TarjetaDetalleView from '../views/TarjetaDetalleView.vue'
import PerfilView from '../views/PerfilView.vue'
import RestablecerView from '../views/RestablecerView.vue'
import LayoutPrincipal from '../components/LayoutPrincipal.vue'

export const rutas = [
  { path: '/login', name: 'login', component: LoginView },
  { path: '/registro', name: 'registro', component: RegistroView },
  { path: '/restablecer', name: 'restablecer', component: RestablecerView },
  {
    path: '/',
    component: LayoutPrincipal,
    meta: { requiereAuth: true },
    children: [
      { path: '', redirect: '/movimientos' },
      { path: 'movimientos', name: 'movimientos', component: MovimientosView, meta: { requiereAuth: true } },
      { path: 'presupuestos', name: 'presupuestos', component: PresupuestosView, meta: { requiereAuth: true } },
      { path: 'tarjetas', name: 'tarjetas', component: TarjetasView, meta: { requiereAuth: true } },
      { path: 'metas', name: 'metas', component: MetasView, meta: { requiereAuth: true } },
      { path: 'estadisticas', name: 'estadisticas', component: EstadisticasView, meta: { requiereAuth: true } },
      { path: 'perfil', name: 'perfil', component: PerfilView, meta: { requiereAuth: true } },
      { path: 'grupos', name: 'grupos', component: GruposView, meta: { requiereAuth: true } },
      { path: 'grupos/:id', name: 'grupo-detalle', component: GrupoDetalleView, meta: { requiereAuth: true } },
      { path: 'invitaciones/aceptar', name: 'aceptar-invitacion', component: AceptarInvitacionView, meta: { requiereAuth: true } },
      { path: 'tarjetas/:id', name: 'tarjeta-detalle', component: TarjetaDetalleView, meta: { requiereAuth: true } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export function crearRouter(historial) {
  const router = createRouter({
    history: historial ?? (typeof window === 'undefined' ? createMemoryHistory() : createWebHistory()),
    routes: rutas
  })

  router.beforeEach(async (to) => {
    const sesion = useSesion()
    if (!sesion.cargada && !sesion.usuario) await sesion.cargarSesion()
    const requiereAuth = to.matched.some((r) => r.meta.requiereAuth)
    if (requiereAuth && !sesion.usuario) return { path: '/login', query: { redirect: to.fullPath } }
    if ((to.path === '/login' || to.path === '/registro') && sesion.usuario) return { path: '/' }
  })

  return router
}
