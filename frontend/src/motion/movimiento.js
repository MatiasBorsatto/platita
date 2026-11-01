import { animate, stagger } from 'motion'

// Curva de entrada suave: arranca rápido y frena despacio.
const ENTRADA = [0.22, 1, 0.36, 1]

// Vue espera a que termine la salida para montar la vista nueva. Se usa un temporizador con la
// misma duración en lugar de onComplete, que no siempre se dispara.
const tras = (ms, done) => setTimeout(done, ms)

// Sin matchMedia (entornos de prueba) se asume preferencia de reducir movimiento: no se anima.
export function reducido() {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Cambio entre páginas: la vista nueva entra con un leve desplazamiento y sus bloques aparecen en cascada.
export function entrarPagina(el, done) {
  // Quita restos de la salida anterior: sin esto la vista nueva puede quedar con opacidad 0.
  el.getAnimations?.().forEach((a) => a.cancel())
  if (reducido()) return done()
  const hijos = Array.from(el.children)
  if (hijos.length) {
    animate(hijos, { opacity: [0, 1], transform: ['translateY(14px)', 'translateY(0px)'] }, {
      duration: 0.45,
      delay: stagger(0.06),
      ease: ENTRADA
    })
  }
  animate(el, { opacity: [0, 1] }, { duration: 0.25 })
  tras(250, done)
}

export function salirPagina(el, done) {
  if (reducido()) return done()
  animate(el, { opacity: [1, 0], transform: ['translateY(0px)', 'translateY(-8px)'] }, {
    duration: 0.18,
    ease: 'easeIn'
  })
  tras(180, done)
}

// Paneles flotantes (por ejemplo, la campana): aparecen desde una escala ligeramente menor.
export function abrirPanel(el, done) {
  if (reducido()) return done()
  animate(el, { opacity: [0, 1], transform: ['scale(0.94) translateY(-6px)', 'scale(1) translateY(0px)'] }, {
    duration: 0.3,
    ease: ENTRADA
  })
  tras(300, done)
}

export function cerrarPanel(el, done) {
  if (reducido()) return done()
  animate(el, { opacity: [1, 0] }, { duration: 0.15 })
  tras(150, done)
}

// Barras de progreso: crecen desde cero hasta su valor al montarse.
export function crecerBarra(el, porcentaje) {
  if (reducido()) return
  animate(el, { width: ['0%', `${porcentaje}%`] }, { duration: 0.9, ease: ENTRADA })
}

// Cifras: suben desde 0 hasta su valor. Devuelve el control para poder detenerlo.
export function contar(valor, onUpdate) {
  if (reducido()) {
    onUpdate(valor)
    return null
  }
  return animate(0, valor, { duration: 0.8, ease: ENTRADA, onUpdate })
}
