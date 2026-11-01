const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Movimiento, Tarjeta, Compra } = require('../src/db/models');
const { crearCompra } = require('../src/modules/tarjetas/compras.service');
const { resumenTarjeta, registrarPagoResumen } = require('../src/modules/tarjetas/resumen.service');

const app = createApp();
const sufijo = Date.now();
const correoA = `res-a-${sufijo}@example.com`;
const correoB = `res-b-${sufijo}@example.com`;
const password = 'clave-segura-1';
let agentA;
let agentB;
let usuarioA;
let tarjeta;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

beforeAll(async () => {
  agentA = await sesion(correoA, 'Ana');
  agentB = await sesion(correoB, 'Bruno');
  usuarioA = await Usuario.findOne({ where: { email: correoA } });
  tarjeta = await Tarjeta.create({ usuarioId: usuarioA.id, nombre: 'Visa', diaCierre: 15, diaVencimiento: 25 });
});

afterAll(async () => {
  const usuarios = await Usuario.findAll({ where: { email: [correoA, correoB] } });
  const ids = usuarios.map((u) => u.id);
  await Movimiento.destroy({ where: { usuarioId: ids } });
  await Compra.destroy({ where: { usuarioId: ids } });
  await Tarjeta.destroy({ where: { usuarioId: ids } });
  await Usuario.destroy({ where: { email: [correoA, correoB] } });
  await sequelize.close();
});

test('una compra del 10 con cierre el 15 cae en el resumen de ese mes, con período y vencimiento', async () => {
  await crearCompra(usuarioA.id, tarjeta.id, {
    montoTotal: '1000.50', cuotas: 1, modalidad: 'compra_completa', fecha: '2026-03-10',
  });
  // Compra del día de cierre (inclusive) y una posterior que va al resumen siguiente.
  await crearCompra(usuarioA.id, tarjeta.id, {
    montoTotal: '200.25', cuotas: 1, modalidad: 'compra_completa', fecha: '2026-03-15',
  });
  await crearCompra(usuarioA.id, tarjeta.id, {
    montoTotal: '999.00', cuotas: 1, modalidad: 'compra_completa', fecha: '2026-03-16',
  });
  const r = await resumenTarjeta(usuarioA.id, tarjeta.id, '2026-03');
  expect(r.desde).toBe('2026-02-16');
  expect(r.hasta).toBe('2026-03-15');
  expect(r.vencimiento).toBe('2026-04-25');
  expect(r.total).toBe('1200.75');
  expect(r.movimientos.map((m) => m.fecha).sort()).toEqual(['2026-03-10', '2026-03-15']);
});

test('una compra_completa de 6 cuotas aparece en cuotasFuturas con 5 entradas', async () => {
  const t = await Tarjeta.create({ usuarioId: usuarioA.id, nombre: 'Master', diaCierre: 15, diaVencimiento: 5 });
  await crearCompra(usuarioA.id, t.id, {
    montoTotal: '60000.00', cuotas: 6, modalidad: 'compra_completa', fecha: '2026-03-10',
  });
  const r = await resumenTarjeta(usuarioA.id, t.id, '2026-03');
  expect(r.cuotasFuturas).toHaveLength(5);
  expect(r.cuotasFuturas[0]).toEqual({ mes: '2026-04', monto: '10000.00' });
  expect(r.cuotasFuturas[4].mes).toBe('2026-08');
});

test('registrarPagoResumen crea un movimiento pago_tarjeta sin categoría', async () => {
  const mov = await registrarPagoResumen(usuarioA.id, tarjeta.id, { monto: '500.00', fecha: '2026-04-20' });
  expect(mov.tipo).toBe('pago_tarjeta');
  expect(mov.categoriaId).toBeNull();
  expect(mov.tarjetaId).toBe(tarjeta.id);
  expect(mov.monto).toBe('500.00');
});

test('el pago no cuenta en el total del resumen', async () => {
  const r = await resumenTarjeta(usuarioA.id, tarjeta.id, '2026-04');
  expect(r.total).toBe('999.00'); // solo la compra del 16/03; el pago de 500 no suma
});

test('API: GET resumen y POST pagos; tarjeta ajena da 404; validaciones 400', async () => {
  const res = await agentA.get(`/api/tarjetas/${tarjeta.id}/resumen?mes=2026-03`);
  expect(res.status).toBe(200);
  expect(res.body.total).toBe('1200.75');
  expect((await agentA.get(`/api/tarjetas/${tarjeta.id}/resumen`)).status).toBe(400);
  expect((await agentB.get(`/api/tarjetas/${tarjeta.id}/resumen?mes=2026-03`)).status).toBe(404);

  const pago = await agentA.post(`/api/tarjetas/${tarjeta.id}/pagos`).send({ monto: '100.00', fecha: '2026-04-21' });
  expect(pago.status).toBe(201);
  expect(pago.body.tipo).toBe('pago_tarjeta');
  expect((await agentA.post(`/api/tarjetas/${tarjeta.id}/pagos`).send({ monto: '-1', fecha: '2026-04-21' })).status).toBe(400);
  expect((await agentB.post(`/api/tarjetas/${tarjeta.id}/pagos`).send({ monto: '100.00', fecha: '2026-04-21' })).status).toBe(404);
});
