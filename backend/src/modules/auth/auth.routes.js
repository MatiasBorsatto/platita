const { Router } = require('express');
const controller = require('./auth.controller');
const usuarioService = require('../usuario/usuario.service');

const router = Router();
router.post('/registro', controller.registro);
router.post('/login', controller.login);
router.post('/google', controller.google);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.post('/recuperar', async (req, res) => {
  await usuarioService.solicitarRecuperacion(req.body?.email);
  res.json({ mensaje: 'Si el email está registrado, recibirás instrucciones' });
});
router.post('/restablecer', async (req, res) => {
  await usuarioService.restablecerPassword(req.body?.token, req.body?.password);
  res.json({ mensaje: 'Contraseña actualizada' });
});

module.exports = router;
