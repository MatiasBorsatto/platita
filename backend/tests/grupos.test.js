const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Grupo, MiembroGrupo } = require('../src/db/models');

const app = createApp();
const sufijo = Date.now();
const correos = ['a', 'b', 'c'].map((x) => `grupos-${x}-${sufijo}@example.com`);
const password = 'clave-segura-1';
let agentA;
let agentB;
let agentC;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

beforeAll(async () => {
  agentA = await sesion(correos[0], 'Ana');
  agentB = await sesion(correos[1], 'Bruno');
  agentC = await sesion(correos[2], 'Carla');
});

afterAll(async () => {
  const usuarios = await Usuario.findAll({ where: { email: correos } });
  const ids = usuarios.map((u) => u.id);
  await MiembroGrupo.destroy({ where: { usuarioId: ids } });
  await Grupo.destroy({ where: { creadoPor: ids } });
  await Usuario.destroy({ where: { email: correos } });
  await sequelize.close();
});

async function crear(agent, nombre) {
  const res = await agent.post('/api/grupos').send({ nombre });
  expect(res.status).toBe(201);
  return res.body;
}

describe('grupos', () => {
  test('crear: el creador queda admin y el código se genera', async () => {
    const g = await crear(agentA, 'Familia');
    expect(g.nombre).toBe('Familia');
    expect(g.codigo).toMatch(/^[A-Z0-9]{8}$/);
    expect(g.rol).toBe('admin');
  });

  test('nombre vacío responde 400', async () => {
    const res = await agentA.post('/api/grupos').send({ nombre: '  ' });
    expect(res.status).toBe(400);
  });

  test('requiere autenticación', async () => {
    expect((await request(app).get('/api/grupos')).status).toBe(401);
  });

  test('no miembro pide GET /api/grupos/:id y recibe 404; miembro recibe 200', async () => {
    const g = await crear(agentA, 'Privado');
    expect((await agentB.get(`/api/grupos/${g.id}`)).status).toBe(404);
    const ok = await agentA.get(`/api/grupos/${g.id}`);
    expect(ok.status).toBe(200);
    expect(ok.body.miembros).toHaveLength(1);
  });

  test('unirse con código; un miembro no puede regenerar el código (403)', async () => {
    const g = await crear(agentA, 'Casa');
    const res = await agentB.post('/api/grupos/unirse').send({ codigo: g.codigo });
    expect(res.status).toBe(200);
    expect(res.body.rol).toBe('miembro');
    expect((await agentB.post(`/api/grupos/${g.id}/codigo/regenerar`)).status).toBe(403);
    expect((await agentB.get(`/api/grupos/${g.id}`)).status).toBe(200);
  });

  test('unirse dos veces responde 409', async () => {
    const g = await crear(agentA, 'Doble');
    await agentB.post('/api/grupos/unirse').send({ codigo: g.codigo });
    expect((await agentB.post('/api/grupos/unirse').send({ codigo: g.codigo })).status).toBe(409);
  });

  test('unirse con el código anterior tras regenerar responde 400', async () => {
    const g = await crear(agentA, 'Regen');
    const reg = await agentA.post(`/api/grupos/${g.id}/codigo/regenerar`);
    expect(reg.status).toBe(200);
    expect(reg.body.codigo).not.toBe(g.codigo);
    expect((await agentB.post('/api/grupos/unirse').send({ codigo: g.codigo })).status).toBe(400);
    expect((await agentB.post('/api/grupos/unirse').send({ codigo: reg.body.codigo })).status).toBe(200);
  });

  test('código inexistente responde 400', async () => {
    expect((await agentB.post('/api/grupos/unirse').send({ codigo: 'ZZZZZZZZ' })).status).toBe(400);
  });

  test('un usuario puede estar en dos grupos a la vez', async () => {
    const g1 = await crear(agentA, 'Uno');
    const g2 = await crear(agentC, 'Dos');
    await agentB.post('/api/grupos/unirse').send({ codigo: g1.codigo });
    await agentB.post('/api/grupos/unirse').send({ codigo: g2.codigo });
    const lista = await agentB.get('/api/grupos');
    expect(lista.status).toBe(200);
    const ids = lista.body.map((g) => g.id);
    expect(ids).toEqual(expect.arrayContaining([g1.id, g2.id]));
  });

  test('el último admin que sale recibe 409; un miembro sí puede salir', async () => {
    const g = await crear(agentA, 'Salida');
    await agentB.post('/api/grupos/unirse').send({ codigo: g.codigo });
    expect((await agentA.post(`/api/grupos/${g.id}/salir`)).status).toBe(409);
    expect((await agentB.post(`/api/grupos/${g.id}/salir`)).status).toBe(204);
    expect((await agentB.get(`/api/grupos/${g.id}`)).status).toBe(404);
  });

  test('admin quita a un miembro; miembro no puede (403); no se quita al último admin', async () => {
    const g = await crear(agentA, 'Quitar');
    await agentB.post('/api/grupos/unirse').send({ codigo: g.codigo });
    await agentC.post('/api/grupos/unirse').send({ codigo: g.codigo });
    const usuarioB = await Usuario.findOne({ where: { email: correos[1] } });
    const usuarioA = await Usuario.findOne({ where: { email: correos[0] } });
    expect((await agentC.delete(`/api/grupos/${g.id}/miembros/${usuarioB.id}`)).status).toBe(403);
    expect((await agentA.delete(`/api/grupos/${g.id}/miembros/${usuarioB.id}`)).status).toBe(204);
    expect((await agentB.get(`/api/grupos/${g.id}`)).status).toBe(404);
    expect((await agentA.delete(`/api/grupos/${g.id}/miembros/${usuarioA.id}`)).status).toBe(409);
    expect((await agentA.delete(`/api/grupos/${g.id}/miembros/${usuarioB.id}`)).status).toBe(404);
  });

  test('id de grupo malformado responde 404', async () => {
    expect((await agentA.get('/api/grupos/no-es-uuid')).status).toBe(404);
  });

  test('cambiar rol: promover, 403 de miembro, 404 de no miembro, 409 al degradar al último admin', async () => {
    const g = await crear(agentA, 'Roles');
    await agentB.post('/api/grupos/unirse').send({ codigo: g.codigo });
    const uA = await Usuario.findOne({ where: { email: correos[0] } });
    const uB = await Usuario.findOne({ where: { email: correos[1] } });
    const uC = await Usuario.findOne({ where: { email: correos[2] } });
    const url = (u) => `/api/grupos/${g.id}/miembros/${u.id}`;

    expect((await agentB.patch(url(uB)).send({ rol: 'admin' })).status).toBe(403);
    expect((await agentA.patch(url(uC)).send({ rol: 'admin' })).status).toBe(404);
    expect((await agentA.patch(url(uB)).send({ rol: 'dios' })).status).toBe(400);
    expect((await agentA.patch(url(uA)).send({ rol: 'miembro' })).status).toBe(409);

    const res = await agentA.patch(url(uB)).send({ rol: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: expect.any(String), usuarioId: uB.id, rol: 'admin' });

    // con dos admins el primero ya puede salir
    expect((await agentA.post(`/api/grupos/${g.id}/salir`)).status).toBe(204);
  });

  test('no miembro no puede regenerar ni salir (404)', async () => {
    const g = await crear(agentA, 'Ajeno');
    expect((await agentB.post(`/api/grupos/${g.id}/codigo/regenerar`)).status).toBe(404);
    expect((await agentB.post(`/api/grupos/${g.id}/salir`)).status).toBe(404);
  });
});
