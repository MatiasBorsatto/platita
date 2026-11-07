import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import { useSesion } from '../stores/sesion.js'
import LoginView from '../views/LoginView.vue'
import RegistroView from '../views/RegistroView.vue'
import MovimientosView from '../views/MovimientosView.vue'
import PresupuestosView from '../views/PresupuestosView.vue'
import GastosFijosView from '../views/GastosFijosView.vue'
import MetasView from '../views/MetasView.vue'
import GruposView from '../views/GruposView.vue'
import GrupoDetalleView from '../views/GrupoDetalleView.vue'
import AceptarInvitacionView from '../views/AceptarInvitacionView.vue'
import EstadisticasView from '../views/EstadisticasView.vue'
import GastoFijoDetalleView from '../views/GastoFijoDetalleView.vue'
import CategoriasView from '../views/CategoriasView.vue'
import PerfilView from '../views/PerfilView.vue'
import RestablecerView from '../views/RestablecerView.vue'
import CompletarFechaView from '../views/CompletarFechaView.vue'
import LayoutPrincipal from '../components/LayoutPrincipal.vue'

export const rutas = [
  { path: '/login', name: 'login', component: LoginView },
  { path: '/registro', name: 'registro', component: RegistroView },
  { path: '/restablecer', name: 'restablecer', component: RestablecerView },
  { path: '/completar-fecha', name: 'completar-fecha', component: CompletarFechaView, meta: { requiereAuth: true } },
  {
    path: '/',
    component: LayoutPrincipal,
    meta: { requiereAuth: true },
    children: [
      { path: '', redirect: '/movimientos' },
      { path: 'movimientos', name: 'movimientos', component: MovimientosView, meta: { requiereAuth: true } },
      { path: 'presupuestos', name: 'presupuestos', component: PresupuestosView, meta: { requiereAuth: true } },
      { path: 'gastos-fijos', name: 'gastos-fijos', component: GastosFijosView, meta: { requiereAuth: true } },
      { path: 'gastos-fijos/:id', name: 'gasto-fijo-detalle', component: GastoFijoDetalleView, meta: { requiereAuth: true } },
      { path: 'categorias', name: 'categorias', component: CategoriasView, meta: { requiereAuth: true } },
      { path: 'metas', name: 'metas', component: MetasView, meta: { requiereAuth: true } },
      { path: 'estadisticas', name: 'estadisticas', component: EstadisticasView, meta: { requiereAuth: true } },
      { path: 'perfil', name: 'perfil', component: PerfilView, meta: { requiereAuth: true } },
      { path: 'grupos', name: 'grupos', component: GruposView, meta: { requiereAuth: true } },
      { path: 'grupos/:id', name: 'grupo-detalle', component: GrupoDetalleView, meta: { requiereAuth: true } },
      { path: 'invitaciones/aceptar', name: 'aceptar-invitacion', component: AceptarInvitacionView, meta: { requiereAuth: true } }
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
    // Sin fecha de nacimiento, la única pantalla disponible es completarla.
    if (sesion.usuario && !sesion.usuario.fechaNacimiento && to.path !== '/completar-fecha') return { path: '/completar-fecha' }
    if ((to.path === '/login' || to.path === '/registro') && sesion.usuario) return { path: '/' }
  })

  return router
}
