const { PORT } = require('./config/env');
const { createApp } = require('./app');

createApp().listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
