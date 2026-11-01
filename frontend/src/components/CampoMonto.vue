<script setup>
import { nextTick, ref, watch } from 'vue'

// Campo de monto en pesos: muestra "1.500,50" mientras se escribe y completa los centavos al salir.
// Hacia afuera emite el valor canónico "1500.50" (el que acepta normalizarMonto).
const props = defineProps({
  modelValue: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const texto = ref('')
const el = ref(null)

// Separa un texto en parte entera y decimales. Si hay coma, los puntos son separadores de miles.
// Sin coma, un punto seguido de 1-2 dígitos al final es decimal ("1500.5"); con 3 dígitos es miles.
function partir(crudo) {
  let t = String(crudo ?? '').replace(/[^\d.,]/g, '')
  let decimales = null
  if (t.includes(',')) {
    const i = t.lastIndexOf(',')
    decimales = t.slice(i + 1).replace(/\D/g, '').slice(0, 2)
    t = t.slice(0, i)
  } else if (/\.\d{1,2}$/.test(t)) {
    const i = t.lastIndexOf('.')
    decimales = t.slice(i + 1)
    t = t.slice(0, i)
  }
  const entero = t.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 10)
  return { entero, decimales }
}

function formatear({ entero, decimales }) {
  const grupos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (decimales === null) return grupos
  return `${grupos || '0'},${decimales}`
}

function canonico({ entero, decimales }) {
  if (!entero && !decimales) return ''
  const base = entero || '0'
  return decimales ? `${base}.${decimales.padEnd(2, '0')}` : base
}

// Cuántos dígitos quedan a la izquierda del cursor, para volver a ubicarlo tras formatear.
function posicionCursor(formateado, digitosIzq) {
  if (digitosIzq === 0) return 0
  let n = 0
  for (let i = 0; i < formateado.length; i++) {
    if (/\d/.test(formateado[i])) n++
    if (n >= digitosIzq) return i + 1
  }
  return formateado.length
}

function alEscribir(evento) {
  const input = evento.target
  const crudo = input.value
  const caret = input.selectionStart ?? crudo.length
  const digitosIzq = crudo.slice(0, caret).replace(/\D/g, '').length
  const partes = partir(crudo)
  const nuevo = formatear(partes)
  texto.value = nuevo
  input.value = nuevo
  emit('update:modelValue', canonico(partes))
  nextTick(() => input.setSelectionRange(posicionCursor(nuevo, digitosIzq), posicionCursor(nuevo, digitosIzq)))
}

// Al salir del campo completa los centavos: "1500" -> "1.500,00", "15,5" -> "15,50".
function alSalir() {
  const partes = partir(texto.value)
  if (!partes.entero && partes.decimales === null) {
    texto.value = ''
    emit('update:modelValue', '')
    return
  }
  const completo = { entero: partes.entero || '0', decimales: (partes.decimales ?? '').padEnd(2, '0') }
  texto.value = formatear(completo)
  emit('update:modelValue', canonico(completo))
}

// Valor que llega desde fuera (edición o reset): se muestra con formato, salvo que ya coincida.
watch(
  () => props.modelValue,
  (valor) => {
    if (valor === canonico(partir(texto.value))) return
    texto.value = formatear(partir(valor))
  },
  { immediate: true }
)
</script>

<template>
  <input
    ref="el"
    type="text"
    inputmode="decimal"
    autocomplete="off"
    placeholder="0,00"
    :value="texto"
    @input="alEscribir"
    @blur="alSalir"
  />
</template>
