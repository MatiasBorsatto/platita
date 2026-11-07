const { Router } = require('express');
const { autenticarSinFecha } = require('../../middlewares/autenticar');
const service = require('./usuario.service');

const router = Router();
router.get('/perfil', autenticarSinFecha, async (req, res) => {
  res.json(await service.obtenerPerfil(req.usuario.id));
});
router.patch('/perfil', autenticarSinFecha, async (req, res) => {
  res.json(await service.actualizarPerfil(req.usuario.id, req.body));
});

module.exports = router;
