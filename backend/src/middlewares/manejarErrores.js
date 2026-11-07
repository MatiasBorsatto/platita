// Express identifica el manejador de errores por sus 4 parámetros.
// eslint-disable-next-line no-unused-vars
function manejarErrores(err, req, res, next) {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  const cuerpo = { error: status === 500 ? 'Error interno del servidor' : err.message };
  if (err.codigo) cuerpo.codigo = err.codigo;
  res.status(status).json(cuerpo);
}

module.exports = { manejarErrores };
