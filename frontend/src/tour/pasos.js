// Pasos del tour guiado. Cada paso puede llevar a una ruta y resaltar un elemento marcado con
// data-tour="...". Sin objetivo, la tarjeta aparece centrada. Los íconos son trazos SVG de 24x24.

const ICONOS = {
  hola: ['M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h10'],
  plata: ['M3 7h18v10H3z', 'M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5', 'M6 12h.01', 'M18 12h.01'],
  cargar: ['M12 5v14', 'M5 12h14'],
  lista: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  etiqueta: ['M3 12V4h8l10 10-8 8z', 'M7.5 7.5h.01'],
  presupuesto: ['M21 12A9 9 0 1 1 12 3v9h9'],
  fijos: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6', 'M9 12h6'],
  meta: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2'],
  grupo: ['M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M2 21a7 7 0 0 1 14 0', 'M16 3.1a4 4 0 0 1 0 7.8', 'M22 21a7 7 0 0 0-5-6.7'],
  grafico: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M2 20h20'],
  deuda: ['M3 7h18v10H3z', 'M7 12h.01', 'M17 12h.01', 'M12 7v10'],
  escudo: ['M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z', 'M9 12l2 2 4-4'],
  campana: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.9 1.9 0 0 0 3.4 0'],
  ayuda: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3', 'M12 17h.01'],
  listo: ['M20 6 9 17l-5-5']
}

export const PASOS = [
  {
    id: 'bienvenida',
    icono: ICONOS.hola,
    titulo: '¡Bienvenido a Platita!',
    texto: 'En un minuto te mostramos todo lo que podés hacer. Podés avanzar con las flechas del teclado o con los botones.',
    consejos: ['Salí cuando quieras con Esc o "Saltar".', 'Volvé a verlo con el botón "?" de abajo a la derecha.']
  },
  {
    id: 'menu',
    objetivo: 'nav-principal',
    icono: ICONOS.menu,
    titulo: 'Tu menú',
    texto: 'Desde acá vas a cada sección. La que tiene color es donde estás ahora.'
  },
  {
    id: 'mi-plata',
    ruta: '/movimientos',
    objetivo: 'mi-plata',
    icono: ICONOS.plata,
    titulo: 'Cuánta plata tenés',
    texto: '"Mi plata" suma tus ingresos y resta tus gastos hasta hoy. Si usás dólares, aparecen por separado.'
  },
  {
    id: 'cargar-movimiento',
    ruta: '/movimientos',
    objetivo: 'cargar-movimiento',
    icono: ICONOS.cargar,
    titulo: 'Anotá cada ingreso o gasto',
    texto: 'Elegí si entró o salió plata, el monto y la fecha. Lo demás es opcional.',
    consejos: ['Elegí una meta para que el monto sume a tu ahorro.', 'Si estás en un grupo, elegí "Compartido con un grupo" para dividir el gasto.']
  },
  {
    id: 'lista-movimientos',
    ruta: '/movimientos',
    objetivo: 'lista-movimientos',
    icono: ICONOS.lista,
    titulo: 'Encontrá cualquier movimiento',
    texto: 'Filtrá por mes, tipo o categoría. Desde cada fila podés editarlo o borrarlo.'
  },
  {
    id: 'categorias',
    ruta: '/movimientos',
    objetivo: 'link-categorias',
    icono: ICONOS.etiqueta,
    titulo: 'Tus propias categorías',
    texto: 'Además de las que vienen de fábrica, podés crear las tuyas para ordenar mejor tus gastos.'
  },
  {
    id: 'presupuestos',
    ruta: '/presupuestos',
    objetivo: 'nuevo-presupuesto',
    icono: ICONOS.presupuesto,
    titulo: 'Ponele un tope a cada gasto',
    texto: 'Elegí una categoría, el mes y cuánto querés gastar como máximo.',
    consejos: ['Te avisamos al llegar al 80 % y al pasarte.', 'La barra cambia de color a medida que te acercás al tope.']
  },
  {
    id: 'gastos-fijos',
    ruta: '/gastos-fijos',
    objetivo: 'agregar-gasto-fijo',
    icono: ICONOS.fijos,
    titulo: 'Lo que pagás todos los meses',
    texto: 'Cargá servicios, alquiler o compras en cuotas una sola vez. Cada mes te recordamos el vencimiento.',
    consejos: ['Al tocar "Pagar", el gasto se anota solo en Movimientos.']
  },
  {
    id: 'metas',
    ruta: '/metas',
    objetivo: 'nueva-meta',
    icono: ICONOS.meta,
    titulo: 'Ahorrá para algo',
    texto: 'Creá una meta con cuánto necesitás y para cuándo. La barra muestra cuánto te falta.',
    consejos: ['Las metas de grupo las completan entre todos.']
  },
  {
    id: 'grupos',
    ruta: '/grupos',
    objetivo: 'grupos-acciones',
    icono: ICONOS.grupo,
    titulo: 'Compartí gastos con tu familia',
    texto: 'Creá un grupo o sumate con un código. Ahí cargan gastos entre todos y la app calcula quién le debe a quién.'
  },
  {
    id: 'estadisticas',
    ruta: '/estadisticas',
    objetivo: 'resumen-mes',
    icono: ICONOS.grafico,
    titulo: 'Mirá en qué se va la plata',
    texto: 'El resumen del mes muestra ingresos, gastos y ahorro. Más abajo, la evolución de varios meses.'
  },
  {
    id: 'deudas',
    ruta: '/deudas',
    objetivo: 'deudas',
    icono: ICONOS.deuda,
    titulo: 'Lo que tenés pendiente',
    texto: 'Todas las cuotas sin pagar en un solo lugar. Las vencidas se marcan para que no se te pasen.'
  },
  {
    id: 'control-parental',
    ruta: '/control-parental',
    objetivo: 'control-parental',
    icono: ICONOS.escudo,
    titulo: 'Control parental',
    texto: 'Si en tu grupo hay menores, elegí qué puede ver y hacer cada uno. Las tarjetas nunca se habilitan para menores.'
  },
  {
    id: 'notificaciones',
    objetivo: 'campana',
    icono: ICONOS.campana,
    titulo: 'Avisos',
    texto: 'Acá llegan las alertas de presupuestos y vencimientos. El número indica cuántas no leíste.'
  },
  {
    id: 'ayuda',
    objetivo: 'boton-ayuda',
    icono: ICONOS.ayuda,
    titulo: '¿Te olvidaste de algo?',
    texto: 'Tocá este botón cuando quieras para volver a ver el recorrido completo.'
  },
  {
    id: 'fin',
    ruta: '/movimientos',
    icono: ICONOS.listo,
    titulo: '¡Listo para empezar!',
    texto: 'Te recomendamos cargar tu primer ingreso en Movimientos. Todo lo demás se va armando solo.'
  }
]
