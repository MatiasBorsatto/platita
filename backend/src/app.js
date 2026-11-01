const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./modules/auth/auth.routes');
const usuarioRoutes = require('./modules/usuario/usuario.routes');
const categoriasRoutes = require('./modules/categorias/categorias.routes');
const movimientosRoutes = require('./modules/movimientos/movimientos.routes');
const presupuestosRoutes = require('./modules/presupuestos/presupuestos.routes');
const notificacionesRoutes = require('./modules/notificaciones/notificaciones.routes');
const tarjetasRoutes = require('./modules/tarjetas/tarjetas.routes');
const metasRoutes = require('./modules/metas/metas.routes');
const gruposRoutes = require('./modules/grupos/grupos.routes');
const saldosRoutes = require('./modules/saldos/saldos.routes');
const invitacionesRoutes = require('./modules/grupos/invitaciones.routes');
const estadisticasRoutes = require('./modules/estadisticas/estadisticas.routes');
const { manejarErrores } = require('./middlewares/manejarErrores');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (req, res) => {
    res.json({ estado: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/usuario', usuarioRoutes);
  app.use('/api/categorias', categoriasRoutes);
  app.use('/api/movimientos', movimientosRoutes);
  app.use('/api/presupuestos', presupuestosRoutes);
  app.use('/api/notificaciones', notificacionesRoutes);
  app.use('/api/tarjetas', tarjetasRoutes);
  app.use('/api/metas', metasRoutes);
  app.use('/api/grupos', gruposRoutes);
  app.use('/api/grupos', saldosRoutes);
  app.use('/api/invitaciones', invitacionesRoutes);
  app.use('/api/estadisticas', estadisticasRoutes);
  app.use(manejarErrores);

  return app;
}

module.exports = { createApp };
