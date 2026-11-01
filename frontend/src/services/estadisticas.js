import { http } from './http.js'

export const resumenMensual = (mes) => http.get(`/estadisticas/mensual?mes=${encodeURIComponent(mes)}`)
export const serieHistorica = (desde, hasta) =>
  http.get(`/estadisticas/historico?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`)
