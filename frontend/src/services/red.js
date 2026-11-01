import { reactive } from 'vue'

// Cuántas peticiones HTTP están en curso. Lo leen el indicador superior y el bloqueo de envíos.
export const red = reactive({ pendientes: 0 })
