const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const {
  Usuario, Categoria, GastoFijo, ConceptoGastoFijo, CuotaGastoFijo, Movimiento, Notificacion,
} = require('../src/db/models');
const { hoyBA, sumarMeses, formatoMes, diaValido } = require('../src/utils/fechas');

const app = createApp();
const sufijo = Date.now();
const correos = ['a', 'b'].map((x) => `fijos-${x}-${sufijo}@example.com`);
const password = 'clave-segura-1';
const hoy = hoyBA();
const [anioHoy, mesHoyNum] = hoy.split('-').map(Number);
const mesActual = hoy.slice(0, 7);
const mesSiguiente = formatoMes(...Object.values(sumarMeses(anioHoy, mesHoyNum, 1)));
const mesSubsiguiente = formatoMes(...Object.values(sumarMeses(anioHoy, mesHoyNum, 2)));
const diaHoy = Number(hoy.slice(8));
const diaProximo = diaValido(anioHoy, mesHoyNum, diaHoy + 3);

let agentA;
let agentB;
let ids;
let categoriaId;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ fechaNacimiento: '1990-01-01', nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

function crear(agent, datos) {
  return agent.post('/api/gastos-fijos').send(datos);
}

beforeAll(async () => {
  agentA = await sesion(correos[0], 'Ana');
  agentB = await sesion(correos[1], 'Bruno');
  const us = await Usuario.findAll({ where: { email: correos } });
  const porEmail = Object.fromEntries(us.map((u) => [u.email, u.id]));
  ids = { a: porEmail[correos[0]], b: porEmail[correos[1]] };
  categoriaId = (await agentA.post('/api/categorias').send({ nombre: 'Hogar' })).body.id;
});

afterAll(async () => {
  if (ids) {
    const usuarios = Object.values(ids);
    const gastos = await GastoFijo.findAll({ where: { usuarioId: usuarios } });
    const gastoIds = gastos.map((g) => g.id);
    await Notificacion.destroy({ where: { usuarioId: usuarios } });
    await Movimiento.destroy({ where: { usuarioId: usuarios } });
    await CuotaGastoFijo.destroy({ where: { usuarioId: usuarios } });
    await ConceptoGastoFijo.destroy({ where: { gastoFijoId: gastoIds } });
    await GastoFijo.destroy({ where: { usuarioId: usuarios } });
    await Categoria.destroy({ where: { usuarioId: usuarios } });
    await Usuario.destroy({ where: { email: correos } });
  }
  await sequelize.close();
});

test('crea un gasto fijo con un concepto finito y uno recurrente', async () => {
  const res = await crear(agentA, {
    nombre: 'Casa',
    diaVencimiento: 10,
    categoriaId,
    conceptos: [
      { nombre: 'Celular', montoTotal: '1200.00', cuotas: 12, mesInicio: mesActual },
      { nombre: 'Gimnasio', montoTotal: '500.00', recurrente: true, mesInicio: mesActual },
    ],
  });
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ nombre: 'Casa', diaVencimiento: 10, categoriaId, archivado: false });

  const celular = res.body.conceptos.find((c) => c.nombre === 'Celular');
  expect(celular).toMatchObject({ montoTotal: '1200.00', montoCuota: '100.00', cuotasTotales: 12, cuotasPagadas: 0 });
  const gym = res.body.conceptos.find((c) => c.nombre === 'Gimnasio');
  expect(gym).toMatchObject({ montoTotal: '500.00', montoCuota: '500.00', cuotasTotales: null });

  const lista = await agentA.get('/api/gastos-fijos');
  expect(lista.status).toBe(200);
  const casa = lista.body.find((g) => g.id === res.body.id);
  expect(casa.conceptos).toHaveLength(2);
  // 12 cuotas finitas + 1 mensual del recurrente.
  expect(casa.resumen).toMatchObject({ totalMes: '600.00', pendientes: 13, cuotasMes: 2 });
  expect(casa.resumen.proximoVencimiento).toMatch(/^\d{4}-\d{2}-10$/);
});

test('vencimientos y detalle del mes devuelven las cuotas generadas', async () => {
  const lista = await agentA.get('/api/gastos-fijos');
  const casa = lista.body.find((g) => g.nombre === 'Casa');

  const venc = await agentA.get(`/api/gastos-fijos/vencimientos?mes=${mesActual}`);
  expect(venc.status).toBe(200);
  const propias = venc.body.filter((c) => c.gastoFijoId === casa.id);
  expect(propias.map((c) => c.conceptoNombre).sort()).toEqual(['Celular', 'Gimnasio']);
  expect(propias.every((c) => c.fechaVencimiento === `${mesActual}-10`)).toBe(true);
  expect(propias.find((c) => c.conceptoNombre === 'Celular')).toMatchObject({
    monto: '100.00', cuotas: 12, numeroCuota: 1, estado: 'pendiente',
  });

  const detalle = await agentA.get(`/api/gastos-fijos/${casa.id}?mes=${mesActual}`);
  expect(detalle.status).toBe(200);
  expect(detalle.body.cuotas).toHaveLength(2);
  expect(detalle.body.conceptos.map((c) => c.nombre).sort()).toEqual(['Celular', 'Gimnasio']);

  expect((await agentA.get('/api/gastos-fijos/vencimientos?mes=2026-13')).status).toBe(400);
  expect((await request(app).get('/api/gastos-fijos/vencimientos')).status).toBe(401);
});

test('valida los datos y no expone gastos de otro usuario', async () => {
  const invalidos = [
    { diaVencimiento: 10 },
    { nombre: 'X', diaVencimiento: 0 },
    { nombre: 'X', diaVencimiento: 32 },
    { nombre: 'X', diaVencimiento: 10, conceptos: 'no-es-lista' },
    { nombre: 'X', diaVencimiento: 10, conceptos: [{ nombre: 'A', montoTotal: '10.00', cuotas: 0 }] },
    { nombre: 'X', diaVencimiento: 10, conceptos: [{ nombre: 'A', montoTotal: '10.00', cuotas: 121 }] },
    { nombre: 'X', diaVencimiento: 10, conceptos: [{ nombre: 'A', montoTotal: '0.01', cuotas: 2 }] },
  ];
  for (const payload of invalidos) {
    expect((await crear(agentA, payload)).status).toBe(400);
  }

  const lista = await agentA.get('/api/gastos-fijos');
  const casa = lista.body.find((g) => g.nombre === 'Casa');
  expect((await agentB.get(`/api/gastos-fijos/${casa.id}`)).status).toBe(404);
  expect((await agentB.patch(`/api/gastos-fijos/${casa.id}`).send({ nombre: 'Robado' })).status).toBe(404);
  expect((await agentB.delete(`/api/gastos-fijos/${casa.id}`)).status).toBe(404);
});

test('pagar una cuota crea el movimiento y deshacer lo revierte', async () => {
  const lista = await agentA.get('/api/gastos-fijos');
  const casa = lista.body.find((g) => g.nombre === 'Casa');
  const detalle = await agentA.get(`/api/gastos-fijos/${casa.id}?mes=${mesActual}`);
  const celular = detalle.body.cuotas.find((c) => c.conceptoNombre === 'Celular');
  const gym = detalle.body.cuotas.find((c) => c.conceptoNombre === 'Gimnasio');

  expect((await agentB.post(`/api/gastos-fijos/${casa.id}/cuotas/${celular.id}/pagar`).send({})).status).toBe(404);
  expect((await agentA.post(`/api/gastos-fijos/${casa.id}/cuotas/${celular.id}/pagar`).send({ fecha: '2026-02-30' })).status).toBe(400);

  const pago = await agentA
    .post(`/api/gastos-fijos/${casa.id}/cuotas/${celular.id}/pagar`)
    .send({ fecha: hoy });
  expect(pago.status).toBe(200);
  expect(pago.body.cuota).toMatchObject({ estado: 'pagado', movimientoId: pago.body.movimiento.id });
  expect(pago.body.movimiento).toMatchObject({
    tipo: 'gasto', alcance: 'personal', monto: '100.00', fecha: hoy, gastoFijoId: casa.id, categoriaId,
  });
  expect(pago.body.movimiento.descripcion).toBe('Casa - Celular (1/12)');

  const movId = pago.body.movimiento.id;
  expect((await agentA.patch(`/api/movimientos/${movId}`).send({ monto: '1.00' })).status).toBe(409);
  expect((await agentA.delete(`/api/movimientos/${movId}`)).status).toBe(409);
  expect((await agentA.post(`/api/gastos-fijos/${casa.id}/cuotas/${celular.id}/pagar`).send({})).status).toBe(400);
  expect((await agentA.post(`/api/gastos-fijos/${casa.id}/cuotas/${gym.id}/deshacer-pago`).send({})).status).toBe(400);

  const deshacer = await agentA
    .post(`/api/gastos-fijos/${casa.id}/cuotas/${celular.id}/deshacer-pago`)
    .send({});
  expect(deshacer.status).toBe(200);
  expect(deshacer.body.cuota).toMatchObject({ estado: 'pendiente', movimientoId: null });
  expect(await Movimiento.findByPk(movId)).toBeNull();
  expect((await agentA.post(`/api/gastos-fijos/${casa.id}/cuotas/${celular.id}/deshacer-pago`).send({})).status).toBe(400);
});

test('editar un concepto recalcula solo las cuotas futuras y conserva la pagada', async () => {
  const res = await crear(agentA, {
    nombre: 'Editable',
    diaVencimiento: diaHoy,
    conceptos: [{ nombre: 'Cuota', montoTotal: '300.00', cuotas: 3, mesInicio: mesActual }],
  });
  expect(res.status).toBe(201);
  const gastoId = res.body.id;
  const conceptoId = res.body.conceptos[0].id;

  const detalle = await agentA.get(`/api/gastos-fijos/${gastoId}?mes=${mesActual}`);
  const primera = detalle.body.cuotas.find((c) => c.numeroCuota === 1);
  const pago = await agentA.post(`/api/gastos-fijos/${gastoId}/cuotas/${primera.id}/pagar`).send({ fecha: hoy });
  expect(pago.status).toBe(200);

  const editado = await agentA
    .patch(`/api/gastos-fijos/${gastoId}/conceptos/${conceptoId}`)
    .send({ montoTotal: '600.00' });
  expect(editado.status).toBe(200);
  expect(editado.body.montoTotal).toBe('600.00');

  const despues = await agentA.get(`/api/gastos-fijos/${gastoId}`);
  expect(despues.body.cuotas).toHaveLength(3);
  const porMes = Object.fromEntries(despues.body.cuotas.map((c) => [c.mes, c]));
  expect(porMes[mesActual]).toMatchObject({ monto: '100.00', estado: 'pagado' });
  expect(porMes[mesSiguiente]).toMatchObject({ monto: '200.00', estado: 'pendiente' });
  expect(porMes[mesSubsiguiente]).toMatchObject({ monto: '200.00', estado: 'pendiente' });

  const archivar = await agentA
    .patch(`/api/gastos-fijos/${gastoId}/conceptos/${conceptoId}`)
    .send({ archivado: true });
  expect(archivar.status).toBe(200);
  const sinConcepto = await agentA.get(`/api/gastos-fijos/${gastoId}?mes=${mesActual}`);
  expect(sinConcepto.body.conceptos).toHaveLength(0);
  const venc = await agentA.get(`/api/gastos-fijos/vencimientos?mes=${mesActual}`);
  expect(venc.body.some((c) => c.gastoFijoId === gastoId)).toBe(false);
});

test('eliminar borra si no hay pagos y archiva si hay historial', async () => {
  const sinPagos = await crear(agentA, {
    nombre: 'Borrable',
    diaVencimiento: 10,
    conceptos: [{ nombre: 'Uno', montoTotal: '50.00', cuotas: 1, mesInicio: mesActual }],
  });
  const borrar = await agentA.delete(`/api/gastos-fijos/${sinPagos.body.id}`);
  expect(borrar.status).toBe(200);
  expect(borrar.body).toEqual({ archivado: false });
  expect(await GastoFijo.findByPk(sinPagos.body.id)).toBeNull();
  expect(await ConceptoGastoFijo.count({ where: { gastoFijoId: sinPagos.body.id } })).toBe(0);
  expect(await CuotaGastoFijo.count({ where: { gastoFijoId: sinPagos.body.id } })).toBe(0);

  const conPago = await crear(agentA, {
    nombre: 'Archivable',
    diaVencimiento: diaHoy,
    conceptos: [{ nombre: 'Uno', montoTotal: '50.00', cuotas: 1, mesInicio: mesActual }],
  });
  const detalle = await agentA.get(`/api/gastos-fijos/${conPago.body.id}?mes=${mesActual}`);
  await agentA.post(`/api/gastos-fijos/${conPago.body.id}/cuotas/${detalle.body.cuotas[0].id}/pagar`).send({ fecha: hoy });
  const archivar = await agentA.delete(`/api/gastos-fijos/${conPago.body.id}`);
  expect(archivar.status).toBe(200);
  expect(archivar.body).toEqual({ archivado: true });
  const fila = await GastoFijo.findByPk(conPago.body.id);
  expect(fila).not.toBeNull();
  expect(fila.archivado).toBe(true);
  const lista = await agentA.get('/api/gastos-fijos');
  expect(lista.body.some((g) => g.id === conPago.body.id)).toBe(false);
});

test('recordatorios avisa vencidos y próximos, y no duplica notificaciones', async () => {
  const vencido = await crear(agentA, {
    nombre: 'Vencido',
    diaVencimiento: 1,
    conceptos: [{ nombre: 'Luz', montoTotal: '100.00', recurrente: true, mesInicio: mesActual }],
  });
  const proximo = await crear(agentA, {
    nombre: 'Proximo',
    diaVencimiento: diaProximo,
    conceptos: [{ nombre: 'Agua', montoTotal: '80.00', recurrente: true, mesInicio: mesActual }],
  });
  expect(vencido.status).toBe(201);
  expect(proximo.status).toBe(201);

  const antes = await Notificacion.count({ where: { usuarioId: ids.a, tipo: 'vencimiento' } });
  const primera = await agentA.get('/api/gastos-fijos/recordatorios');
  expect(primera.status).toBe(200);
  const propios = primera.body.filter((c) => ['Vencido', 'Proximo'].includes(c.gastoNombre));
  const porNombre = Object.fromEntries(propios.map((c) => [c.gastoNombre, c]));
  expect(porNombre.Vencido.situacion).toBe('vencido');
  expect(porNombre.Proximo.situacion).toBe('proximo');
  expect(porNombre.Vencido.conceptoNombre).toBe('Luz');

  const despues = await Notificacion.count({ where: { usuarioId: ids.a, tipo: 'vencimiento' } });
  expect(despues).toBeGreaterThan(antes);

  await agentA.get('/api/gastos-fijos/recordatorios');
  expect(await Notificacion.count({ where: { usuarioId: ids.a, tipo: 'vencimiento' } })).toBe(despues);
  const aviso = await Notificacion.findOne({ where: { usuarioId: ids.a, tipo: 'vencimiento', alerta: 'vencido' } });
  expect(aviso).not.toBeNull();
  expect(aviso.mensaje).toContain('Venció el pago de');
  expect(aviso.presupuestoId).toBeNull();
  expect(aviso.cuotaGastoFijoId).not.toBeNull();
});

test('editar el día de vencimiento mueve las cuotas pendientes futuras', async () => {
  const res = await crear(agentA, {
    nombre: 'Mudanza',
    diaVencimiento: 10,
    conceptos: [{ nombre: 'Alquiler', montoTotal: '900.00', recurrente: true, mesInicio: mesActual }],
  });
  expect(res.status).toBe(201);
  const gastoId = res.body.id;
  await agentA.get(`/api/gastos-fijos/${gastoId}?mes=${mesSiguiente}`);

  const editado = await agentA.patch(`/api/gastos-fijos/${gastoId}`).send({ diaVencimiento: 20 });
  expect(editado.status).toBe(200);
  expect(editado.body.diaVencimiento).toBe(20);

  const detalle = await agentA.get(`/api/gastos-fijos/${gastoId}?mes=${mesSiguiente}`);
  const futuras = detalle.body.cuotas.filter((c) => c.mes >= mesSiguiente);
  expect(futuras.length).toBeGreaterThan(0);
  expect(futuras.every((c) => c.fechaVencimiento.endsWith('-20'))).toBe(true);
});
