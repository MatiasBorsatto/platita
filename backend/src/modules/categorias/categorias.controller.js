const service = require('./categorias.service');

async function listar(req, res) {
  res.json(await service.listarCategorias(req.usuario.id));
}

async function crear(req, res) {
  res.status(201).json(await service.crearCategoria(req.usuario.id, req.body));
}

async function editar(req, res) {
  res.json(await service.editarCategoria(req.usuario.id, req.params.id, req.body));
}

async function archivar(req, res) {
  res.json(await service.archivarCategoria(req.usuario.id, req.params.id));
}

module.exports = { listar, crear, editar, archivar };
