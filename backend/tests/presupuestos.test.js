const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Categoria, Movimiento, Presupuesto } = require('../src/db/models');
const { calcularEstado } = require('../src/modules/presupuestos/presupuestos.calculo');

describe('calcularEstado', () => {
  test('por debajo del 80% no hay alerta', () => {
    const e = calcularEstado({ montoLimite: '1000.00', consumido: '799.99' });
    expect(e.alerta).toBeNull();
    expect(e.restante).toBe('200.01');
  });

  test('al llegar al 80% la alerta es "80"', () => {
    expect(calcularEstado({ montoLimite: '1000.00', consumido: '800.00' }).alerta).toBe('80');
  });

  test('exactamente el 100% sigue en alerta "80"', () => {
    const e = calcularEstado({ montoLimite: '1000.00', consumido: '1000.00' });
    expect(e.alerta).toBe('80');
    expect(e.restante).toBe('0.00');
    expect(e.porcentaje).toBe(100);
  });

  test('al superar el 100% la alerta es "100"', () => {
    expect(calcularEstado({ montoLimite: '1000.00', consumido: '1000.01' }).alerta).toBe('100');
  });

  test('restante negativo al excederse', () => {
    const e = calcularEstado({ montoLimite: '1000.00', consumido: '1250.50' });
    expect(e.restante).toBe('-250.50');
    expect(e.porcentaje).toBe(125.05);
  });
});

const app = createApp();
const sufijo = Date.now();
const correoA = `pres-a-${sufijo}@example.com`;
const correoB = `pres-b-${sufijo}@example.com`;
const password = 'clave-segura-1';
let agentA;
let agentB;
let catComida;
let catOcio;
let catBruno;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

beforeAll(async () => {
  agentA = await sesion(correoA, 'Ana');
  agentB = await sesion(correoB, 'Bruno');
  catComida = (await agentA.post('/api/categorias').send({ nombre: 'Comida' })).body.id;
  catOcio = (await agentA.post('/api/categorias').send({ nombre: 'Ocio' })).body.id;
  catBruno = (await agentB.post('/api/categorias').send({ nombre: 'Privada' })).body.id;
});

afterAll(async () => {
  const usuarios = await Usuario.findAll({ where: { email: [correoA, correoB] } });
  const ids = usuarios.map((u) => u.id);
  await Presupuesto.destroy({ where: { usuarioId: ids } });
  await Movimiento.destroy({ where: { usuarioId: ids } });
  await Categoria.destroy({ where: { usuarioId: ids } });
  await Usuario.destroy({ where: { email: [correoA, correoB] } });
  await sequelize.close();
});

const poner = (agent, datos) => agent.put('/api/presupuestos').send(datos);

test('sin sesión responde 401', async () => {
  expect((await request(app).get('/api/presupuestos?mes=2026-10')).status).toBe(401);
});

test('PUT crea y luego actualiza el mismo presupuesto (upsert)', async () => {
  const a = await poner(agentA, { categoriaId: catComida, mes: '2026-10', montoLimite: '1000.5' });
  expect(a.status).toBe(200);
  expect(a.body.montoLimite).toBe('1000.50');
  expect(a.body.regla).toBe('solo_personal');
  const b = await poner(agentA, { categoriaId: catComida, mes: '2026-10', montoLimite: '2000', regla: 'solo_personal' });
  expect(b.body.id).toBe(a.body.id);
  expect(b.body.montoLimite).toBe('2000.00');
  const lista = await agentA.get('/api/presupuestos?mes=2026-10');
  expect(lista.body.filter((p) => p.categoriaId === catComida)).toHaveLength(1);
});

test('una regla desconocida responde 400', async () => {
  const res = await poner(agentA, { categoriaId: catOcio, mes: '2026-10', montoLimite: '10', regla: 'otra' });
  expect(res.status).toBe(400);
});

test('datos inválidos responden 400', async () => {
  expect((await poner(agentA, { categoriaId: catOcio, mes: '2026-13', montoLimite: '10' })).status).toBe(400);
  expect((await poner(agentA, { categoriaId: catOcio, mes: '2026-10', montoLimite: '0' })).status).toBe(400);
  expect((await poner(agentA, { categoriaId: 'x', mes: '2026-10', montoLimite: '10' })).status).toBe(400);
  expect((await poner(agentA, { categoriaId: catBruno, mes: '2026-10', montoLimite: '10' })).status).toBe(400);
  expect((await agentA.get('/api/presupuestos?mes=basura')).status).toBe(400);
  expect((await agentA.get('/api/presupuestos/estado')).status).toBe(400);
});

test('el presupuesto de otro usuario no se ve ni se borra (404)', async () => {
  const p = await poner(agentA, { categoriaId: catOcio, mes: '2026-09', montoLimite: '50' });
  expect((await agentB.get('/api/presupuestos?mes=2026-09')).body).toEqual([]);
  expect((await agentB.delete(`/api/presupuestos/${p.body.id}`)).status).toBe(404);
  expect((await agentA.delete(`/api/presupuestos/${p.body.id}`)).status).toBe(204);
  expect((await agentA.delete(`/api/presupuestos/${p.body.id}`)).status).toBe(404);
});

test('estado suma solo gastos personales propios de la categoría y mes', async () => {
  await poner(agentA, { categoriaId: catOcio, mes: '2026-08', montoLimite: '100.00' });
  const mov = (agent, datos) => agent.post('/api/movimientos').send(datos);
  await mov(agentA, { tipo: 'gasto', monto: '40.10', fecha: '2026-08-01', categoriaId: catOcio });
  await mov(agentA, { tipo: 'gasto', monto: '40.10', fecha: '2026-08-31', categoriaId: catOcio });
  await mov(agentA, { tipo: 'gasto', monto: '5.00', fecha: '2026-09-01', categoriaId: catOcio });
  await mov(agentA, { tipo: 'ingreso', monto: '999.00', fecha: '2026-08-10', categoriaId: catOcio });
  await mov(agentA, { tipo: 'gasto', monto: '7.00', fecha: '2026-08-10', categoriaId: catComida });
  await mov(agentB, { tipo: 'gasto', monto: '500.00', fecha: '2026-08-10' });
  const res = await agentA.get('/api/presupuestos/estado?mes=2026-08');
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0]).toMatchObject({
    categoriaId: catOcio,
    montoLimite: '100.00',
    consumido: '80.20',
    restante: '19.80',
    porcentaje: 80.2,
    alerta: '80',
  });
  expect((await agentB.get('/api/presupuestos/estado?mes=2026-08')).body).toEqual([]);
});
