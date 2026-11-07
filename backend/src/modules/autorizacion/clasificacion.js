const { ErrorValidacion } = require('../../utils/errores');

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

// Edad cumplida a la fecha "hoy": resta los años y descuenta uno si el cumpleaños aún no llegó este año.
function edadA(fechaNacimiento, hoy) {
  const [ay, am, ad] = fechaNacimiento.split('-').map(Number);
  const [hy, hm, hd] = hoy.split('-').map(Number);
  let edad = hy - ay;
  if (hm < am || (hm === am && hd < ad)) edad -= 1;
  return edad;
}

// Valida una fecha de nacimiento real, no futura. Devuelve el texto normalizado YYYY-MM-DD.
function validarFechaNacimiento(valor, hoy) {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  const m = FECHA.exec(texto);
  if (!m) throw new ErrorValidacion('La fecha de nacimiento debe tener el formato AAAA-MM-DD');
  const fecha = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const real = fecha.getUTCFullYear() === Number(m[1]) && fecha.getUTCMonth() === Number(m[2]) - 1 && fecha.getUTCDate() === Number(m[3]);
  if (!real) throw new ErrorValidacion('La fecha de nacimiento no es una fecha válida');
  if (texto > hoy) throw new ErrorValidacion('La fecha de nacimiento no puede ser futura');
  return texto;
}

// 'sin_fecha' hasta que el usuario la carga; luego 'menor' (menos de 18 años) o 'adulto'.
function clasificar(fechaNacimiento, hoy) {
  if (!fechaNacimiento) return 'sin_fecha';
  return edadA(String(fechaNacimiento), hoy) < 18 ? 'menor' : 'adulto';
}

module.exports = { edadA, validarFechaNacimiento, clasificar };
