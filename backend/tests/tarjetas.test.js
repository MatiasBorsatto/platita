const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Movimiento, Tarjeta, Compra } = require('../src/db/models');
const { crearCompra } = require('../src/modules/tarjetas/compras.service');

const app = createApp();
const sufijo = Date.now();
const correoA = `tarj-a-${sufijo}@example.com`;
const correoB = `tarj-b-${sufijo}@example.com`;
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

const delasCompra = (compraId) => Movimiento.findAll({ where: { compraId }, order: [['fecha', 'ASC']] });

test('por_cuota: $60.000 en 6 cuotas genera 6 movimientos de $10.000 en meses consecutivos', async () => {
  const { compra } = await crearCompra(usuarioA.id, tarjeta.id, {
    montoTotal: '60000.00', cuotas: 6, modalidad: 'por_cuota', fecha: '2026-03-10',
  });
  const movs = await delasCompra(compra.id);
  expect(movs).toHaveLength(6);
  expect(movs.map((m) => m.monto)).toEqual(Array(6).fill('10000.00'));
  expect(movs.map((m) => m.fecha.slice(0, 7))).toEqual([
    '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08',
  ]);
  expect(movs.every((m) => m.tipo === 'gasto' && m.tarjetaId === tarjeta.id)).toBe(true);
});

test('por_cuota con compra posterior al cierre empieza el mes siguiente', async () => {
  const { compra } = await crearCompra(usuarioA.id, tarjeta.id, {
    montoTotal: '300.00', cuotas: 3, modalidad: 'por_cuota', fecha: '2026-03-16',
  });
  const movs = await delasCompra(compra.id);
  expect(movs.map((m) => m.fecha.slice(0, 7))).toEqual(['2026-04', '2026-05', '2026-06']);
});

test('por_cuota con centavos: $10.000 en 3 cuotas reparte 3333.34, 3333.33, 3333.33', async () => {
  const { compra } = await crearCompra(usuarioA.id, tarjeta.id, {
    montoTotal: '10000.00', cuotas: 3, modalidad: 'por_cuota', fecha: '2026-03-10',
  });
  const movs = await delasCompra(compra.id);
  expect(movs.map((m) => m.monto)).toEqual(['3333.34', '3333.33', '3333.33']);
});

test('compra_completa genera un único movimiento por el total', async () => {
  const { compra } = await crearCompra(usuarioA.id, tarjeta.id, {
    montoTotal: '60000.00', cuotas: 6, modalidad: 'compra_completa', fecha: '2026-03-10',
  });
  const movs = await delasCompra(compra.id);
  expect(movs).toHaveLength(1);
  expect(movs[0].monto).toBe('60000.00');
  expect(movs[0].fecha).toBe('2026-03-10');
});

test('si falla a mitad la transacción no deja compra ni movimientos', async () => {
  const antes = await Compra.count({ where: { usuarioId: usuarioA.id } });
  await expect(
    crearCompra(usuarioA.id, tarjeta.id, {
      montoTotal: '100.00', cuotas: 2, modalidad: 'por_cuota', fecha: '2026-03-10',
      categoriaId: '00000000-0000-4000-8000-000000000000',
    })
  ).rejects.toThrow();
  expect(await Compra.count({ where: { usuarioId: usuarioA.id } })).toBe(antes);
});

test('CRUD de tarjetas por HTTP y aislamiento entre usuarios', async () => {
  expect((await request(app).get('/api/tarjetas')).status).toBe(401);
  const c = await agentA.post('/api/tarjetas').send({ nombre: 'Master', diaCierre: 31, diaVencimiento: 10 });
  expect(c.status).toBe(201);
  expect((await agentA.post('/api/tarjetas').send({ nombre: 'X', diaCierre: 32, diaVencimiento: 10 })).status).toBe(400);
  expect((await agentA.post('/api/tarjetas').send({ nombre: '', diaCierre: 1, diaVencimiento: 10 })).status).toBe(400);
  const p = await agentA.patch(`/api/tarjetas/${c.body.id}`).send({ diaCierre: 20 });
  expect(p.body.diaCierre).toBe(20);
  expect((await agentB.get('/api/tarjetas')).body).toEqual([]);
  expect((await agentB.patch(`/api/tarjetas/${c.body.id}`).send({ nombre: 'Z' })).status).toBe(404);
  expect((await agentB.delete(`/api/tarjetas/${c.body.id}`)).status).toBe(404);
  expect((await agentA.delete(`/api/tarjetas/${c.body.id}`)).status).toBe(204);
});

test('POST /tarjetas/:id/compras crea la compra; otro usuario recibe 404; datos inválidos 400', async () => {
  const body = { montoTotal: '1200', cuotas: 3, modalidad: 'por_cuota', fecha: '2026-05-01' };
  const ok = await agentA.post(`/api/tarjetas/${tarjeta.id}/compras`).send(body);
  expect(ok.status).toBe(201);
  expect(ok.body.movimientos.map((m) => m.monto)).toEqual(['400.00', '400.00', '400.00']);
  expect((await agentB.post(`/api/tarjetas/${tarjeta.id}/compras`).send(body)).status).toBe(404);
  expect((await agentA.post(`/api/tarjetas/${tarjeta.id}/compras`).send({ ...body, modalidad: 'x' })).status).toBe(400);
  expect((await agentA.post(`/api/tarjetas/${tarjeta.id}/compras`).send({ ...body, cuotas: 0 })).status).toBe(400);
  expect((await agentA.post(`/api/tarjetas/${tarjeta.id}/compras`).send({ ...body, montoTotal: '0' })).status).toBe(400);
});

test('no se puede borrar una tarjeta con compras (409)', async () => {
  expect((await agentA.delete(`/api/tarjetas/${tarjeta.id}`)).status).toBe(409);
});

test('la descripción de una compra admite hasta 200 caracteres (201) y 201 da 400', async () => {
  const body = { montoTotal: '1200', cuotas: 3, modalidad: 'por_cuota', fecha: '2026-05-01' };
  const larga = await agentA.post(`/api/tarjetas/${tarjeta.id}/compras`).send({ ...body, descripcion: 'a'.repeat(201) });
  expect(larga.status).toBe(400);
  const justa = await agentA.post(`/api/tarjetas/${tarjeta.id}/compras`).send({ ...body, descripcion: 'a'.repeat(200) });
  expect(justa.status).toBe(201);
  expect(justa.body.movimientos[0].descripcion).toBe(`${'a'.repeat(200)} (1/3)`);
});
