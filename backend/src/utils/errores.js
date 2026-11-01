class ErrorValidacion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorValidacion';
    this.status = 400;
  }
}

class ErrorProhibido extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorProhibido';
    this.status = 403;
  }
}

class ErrorNoEncontrado extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorNoEncontrado';
    this.status = 404;
  }
}

class ErrorConflicto extends ErrorValidacion {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorConflicto';
    this.status = 409;
  }
}

class ErrorNoAutenticado extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorNoAutenticado';
    this.status = 401;
  }
}

class ErrorInterno extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorInterno';
    this.status = 500;
  }
}

module.exports = { ErrorInterno, ErrorValidacion, ErrorProhibido, ErrorNoEncontrado, ErrorConflicto, ErrorNoAutenticado };
