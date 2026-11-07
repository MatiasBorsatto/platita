const { Router } = require('express');
const { autenticar } = require('../../middlewares/autenticar');
const { validarUuid } = require('../movimientos/movimientos.validation');
const { ErrorValidacion } = require('../../utils/errores');
const service = require('./control-parental.service');

const router = Router();
router.use(autenticar);

const grupoDe = (valor) => {
  if (valor === undefined || valor === null || valor === '') throw new ErrorValidacion('Falta el grupo');
  return validarUuid(valor, 'grupoId');
};

router.get('/menores', async (req, res) => {
  res.json(await service.listarMenores(req.usuario.id));
});

router.post('/vinculos', async (req, res) => {
  const grupoId = grupoDe(req.body?.grupoId);
  const resultado = await service.vincularMenor(req.usuario.id, { grupoId, email: req.body?.email });
  res.status(resultado.creado ? 201 : 200).json(resultado);
});

router.patch('/menores/:menorId/permisos', async (req, res) => {
  const menorId = validarUuid(req.params.menorId, 'menorId');
  const grupoId = grupoDe(req.body?.grupoId);
  res.json(await service.actualizarPermisos(req.usuario.id, menorId, grupoId, req.body?.permisos));
});

router.delete('/menores/:menorId', async (req, res) => {
  const menorId = validarUuid(req.params.menorId, 'menorId');
  const grupoId = grupoDe(req.query.grupoId);
  res.json(await service.desvincularMenor(req.usuario.id, menorId, grupoId));
});

router.get('/menores/:menorId/actividad', async (req, res) => {
  const menorId = validarUuid(req.params.menorId, 'menorId');
  res.json(await service.actividad(req.usuario.id, menorId));
});

module.exports = router;
