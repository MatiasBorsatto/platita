const { ErrorValidacion } = require('./errores');

const LIMITE_MAXIMO = 100;

// Paginación opcional. Sin "limite" ni "pagina" devuelve la lista completa, como antes.
// Con ellos devuelve { items, total, pagina, limite }.
function paginar(lista, query = {}) {
  if (query.limite === undefined && query.pagina === undefined) return lista;
  const limite = query.limite === undefined ? 20 : Number(query.limite);
  const pagina = query.pagina === undefined ? 1 : Number(query.pagina);
  if (!Number.isInteger(limite) || limite < 1 || limite > LIMITE_MAXIMO) {
    throw new ErrorValidacion(`El límite debe ser un entero entre 1 y ${LIMITE_MAXIMO}`);
  }
  if (!Number.isInteger(pagina) || pagina < 1) throw new ErrorValidacion('La página debe ser un entero mayor o igual a 1');
  return {
    items: lista.slice((pagina - 1) * limite, pagina * limite),
    total: lista.length,
    pagina,
    limite,
  };
}

module.exports = { paginar, LIMITE_MAXIMO };
