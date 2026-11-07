// Reglas del formulario de gasto fijo. Puras, para probarlas sin montar la pantalla.
export const TIPOS_PAGO = [
  { valor: 'simple', texto: 'Gasto simple' },
  { valor: 'tarjeta_credito', texto: 'Tarjeta de crédito' },
  { valor: 'tarjeta_debito', texto: 'Tarjeta de débito' }
]
export const MONEDAS = ['ARS', 'USD', 'EUR']

export const esTarjeta = (tipo) => tipo === 'tarjeta_credito' || tipo === 'tarjeta_debito'

// Devuelve el primer error del formulario, o null si está listo para enviarse.
export function errorDelFormulario(form) {
  if (!form.nombre.trim()) return 'Ingresá el nombre del gasto fijo.'
  if (!/^\d+$/.test(String(form.diaVencimiento).trim()) || Number(form.diaVencimiento) < 1 || Number(form.diaVencimiento) > 31) {
    return 'El día de vencimiento debe estar entre 1 y 31.'
  }
  if (form.ambito === 'grupo' && !form.grupoId) return 'Elegí el grupo al que pertenece el gasto.'
  if (esTarjeta(form.tipoPago)) {
    if (!/^\d{4}$/.test(String(form.ultimosCuatro).trim())) return 'Ingresá exactamente los últimos cuatro dígitos.'
    if (!form.banco.trim()) return 'Ingresá el banco o entidad.'
    if (!form.titular.trim()) return 'Ingresá el titular de la tarjeta.'
  }
  return null
}

// Arma el cuerpo que espera la API. Los datos de tarjeta solo se envían si corresponde.
export function payloadDelFormulario(form) {
  const base = {
    nombre: form.nombre.trim(),
    diaVencimiento: Number(form.diaVencimiento),
    categoriaId: form.categoriaId || null,
    tipoPago: form.tipoPago,
    moneda: form.moneda,
    ambito: form.ambito,
    grupoId: form.ambito === 'grupo' ? form.grupoId : null
  }
  if (!esTarjeta(form.tipoPago)) return base
  return {
    ...base,
    ultimosCuatro: String(form.ultimosCuatro).trim(),
    banco: form.banco.trim(),
    titular: form.titular.trim(),
    alias: form.alias.trim() || null
  }
}
