const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Categoria, Movimiento } = require('../src/db/models');

const app = createApp();
const sufijo = Date.now();
const correoA = `mov-a-${sufijo}@example.com`;
const correoB = `mov-b-${sufijo}@example.com`;
const password = 'clave-segura-1';
let agentA;
let agentB;
let categoriaId;
let otraCategoriaId;
let categoriaDeBruno;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

const crearComoAna = (datos) => agentA.post('/api/movimientos').send(datos);

beforeAll(async () => {
  agentA = await sesion(correoA, 'Ana');
  agentB = await sesion(correoB, 'Bruno');
  categoriaId = (await agentA.post('/api/categorias').send({ nombre: 'Comida' })).body.id;
  otraCategoriaId = (await agentA.post('/api/categorias').send({ nombre: 'Ocio' })).body.id;
  categoriaDeBruno = (await agentB.post('/api/categorias').send({ nombre: 'Privada' })).body.id;
});

afterAll(async () => {
  const usuarios = await Usuario.findAll({ where: { email: [correoA, correoB] } });
  const ids = usuarios.map((u) => u.id);
  await Movimiento.destroy({ where: { usuarioId: ids } });
  await Categoria.destroy({ where: { usuarioId: ids } });
  await Usuario.destroy({ where: { email: [correoA, correoB] } });
  await sequelize.close();
});

test('sin sesión responde 401', async () => {
  const res = await request(app).get('/api/movimientos');
  expect(res.status).toBe(401);
});

test('monto con decimales se guarda con 2 decimales', async () => {
  const res = await crearComoAna({ tipo: 'gasto', monto: '1500.5', fecha: '2026-10-03', categoriaId });
  expect(res.status).toBe(201);
  expect(res.body.monto).toBe('1500.50');
  expect(res.body.alcance).toBe('personal');
});

test('monto cero responde 400', async () => {
  const res = await crearComoAna({ tipo: 'gasto', monto: '0', fecha: '2026-10-03', categoriaId });
  expect(res.status).toBe(400);
});

test('tipo, fecha y categoría inválidos responden 400', async () => {
  expect((await crearComoAna({ tipo: 'otro', monto: '5', fecha: '2026-10-03' })).status).toBe(400);
  expect((await crearComoAna({ tipo: 'gasto', monto: '5', fecha: '2026-02-30' })).status).toBe(400);
  expect((await crearComoAna({ tipo: 'gasto', monto: '5', fecha: 'ayer' })).status).toBe(400);
  expect(
    (await crearComoAna({ tipo: 'gasto', monto: '5', fecha: '2026-10-03', categoriaId: categoriaDeBruno })).status
  ).toBe(400);
});

test('otro usuario no puede editar el movimiento y recibe 404', async () => {
  const mov = (await crearComoAna({ tipo: 'gasto', monto: '10', fecha: '2026-10-03', categoriaId })).body;
  const res = await agentB.patch(`/api/movimientos/${mov.id}`).send({ monto: '1' });
  expect(res.status).toBe(404);
  const del = await agentB.delete(`/api/movimientos/${mov.id}`);
  expect(del.status).toBe(404);
});

test('editar y eliminar el propio movimiento', async () => {
  const mov = (await crearComoAna({ tipo: 'ingreso', monto: '100', fecha: '2026-09-15', categoriaId })).body;
  const ed = await agentA.patch(`/api/movimientos/${mov.id}`).send({ monto: '250.75', descripcion: 'Sueldo' });
  expect(ed.status).toBe(200);
  expect(ed.body.monto).toBe('250.75');
  expect(ed.body.descripcion).toBe('Sueldo');
  expect((await agentA.patch(`/api/movimientos/${mov.id}`).send({ monto: '-1' })).status).toBe(400);
  expect((await agentA.delete(`/api/movimientos/${mov.id}`)).status).toBe(204);
  expect((await agentA.delete(`/api/movimientos/${mov.id}`)).status).toBe(404);
});

describe('listado', () => {
  let ids;
  beforeAll(async () => {
    const datos = [
      { tipo: 'gasto', monto: '10', fecha: '2031-01-01', categoriaId },
      { tipo: 'gasto', monto: '20', fecha: '2031-01-31', categoriaId: otraCategoriaId },
      { tipo: 'ingreso', monto: '30', fecha: '2031-02-01', categoriaId },
      { tipo: 'gasto', monto: '40', fecha: '2031-02-10', categoriaId },
    ];
    ids = [];
    for (const d of datos) ids.push((await crearComoAna(d)).body.id);
    await agentB.post('/api/movimientos').send({ tipo: 'gasto', monto: '99', fecha: '2031-01-15' });
  });

  test('filtra por mes (límites inclusive) y no mezcla usuarios', async () => {
    const res = await agentA.get('/api/movimientos?mes=2031-01');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items.map((m) => m.id).sort()).toEqual([ids[0], ids[1]].sort());
    expect(res.body.items.every((m) => typeof m.monto === 'string')).toBe(true);
  });

  test('filtra por tipo y categoría', async () => {
    const t = await agentA.get('/api/movimientos?mes=2031-02&tipo=ingreso');
    expect(t.body.total).toBe(1);
    const c = await agentA.get(`/api/movimientos?mes=2031-01&categoriaId=${otraCategoriaId}`);
    expect(c.body.items.map((m) => m.id)).toEqual([ids[1]]);
  });

  test('pagina con limit y page, orden por fecha descendente', async () => {
    const p1 = await agentA.get('/api/movimientos?mes=2031-02&limit=1&page=1');
    expect(p1.body.total).toBe(2);
    expect(p1.body.items).toHaveLength(1);
    expect(p1.body.items[0].id).toBe(ids[3]);
    const p2 = await agentA.get('/api/movimientos?mes=2031-02&limit=1&page=2');
    expect(p2.body.items[0].id).toBe(ids[2]);
  });

  test('limit se acota al máximo y parámetros inválidos responden 400', async () => {
    const res = await agentA.get('/api/movimientos?mes=2031-01&limit=100000');
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100);
    expect((await agentA.get('/api/movimientos?mes=2031-13')).status).toBe(400);
    expect((await agentA.get('/api/movimientos?tipo=x')).status).toBe(400);
    expect((await agentA.get('/api/movimientos?page=0')).status).toBe(400);
  });
});

describe('ids con formato inválido', () => {
  test('PATCH y DELETE con un id que no es UUID dan 404', async () => {
    expect((await agentA.patch('/api/movimientos/no-es-uuid').send({ monto: '10' })).status).toBe(404);
    expect((await agentA.delete('/api/movimientos/no-es-uuid')).status).toBe(404);
  });
});
