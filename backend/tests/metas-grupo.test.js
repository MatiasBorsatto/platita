const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Grupo, MiembroGrupo, Meta, AporteMeta } = require('../src/db/models');

const app = createApp();
const sufijo = Date.now();
const correos = ['a', 'b', 'x'].map((x) => `metag-${x}-${sufijo}@example.com`);
const password = 'clave-segura-1';
let agentA, agentB, agentX, grupoId, otroGrupoId, ids;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

beforeAll(async () => {
  agentA = await sesion(correos[0], 'Ana');
  agentB = await sesion(correos[1], 'Bruno');
  agentX = await sesion(correos[2], 'Xavi');
  const us = await Usuario.findAll({ where: { email: correos } });
  const por = Object.fromEntries(us.map((u) => [u.email, u.id]));
  ids = { a: por[correos[0]], b: por[correos[1]], x: por[correos[2]] };
  const g = await Grupo.create({ nombre: 'Viaje', codigo: `M${String(sufijo).slice(-7)}`, creadoPor: ids.a });
  const g2 = await Grupo.create({ nombre: 'Otro', codigo: `N${String(sufijo).slice(-7)}`, creadoPor: ids.x });
  grupoId = g.id;
  otroGrupoId = g2.id;
  await MiembroGrupo.bulkCreate([
    { grupoId, usuarioId: ids.a, rol: 'admin' },
    { grupoId, usuarioId: ids.b, rol: 'miembro' },
    { grupoId: otroGrupoId, usuarioId: ids.x, rol: 'admin' },
  ]);
});

afterAll(async () => {
  const metas = await Meta.findAll({ where: { usuarioId: Object.values(ids) } });
  await AporteMeta.destroy({ where: { metaId: metas.map((m) => m.id) } });
  await Meta.destroy({ where: { usuarioId: Object.values(ids) } });
  await MiembroGrupo.destroy({ where: { grupoId: [grupoId, otroGrupoId] } });
  await Grupo.destroy({ where: { id: [grupoId, otroGrupoId] } });
  await Usuario.destroy({ where: { email: correos } });
  await sequelize.close();
});

describe('metas de grupo', () => {
  let meta;

  test('un miembro crea una meta de grupo', async () => {
    const res = await agentA.post('/api/metas').send({ nombre: 'Casa', montoObjetivo: '1000.00', grupoId });
    expect(res.status).toBe(201);
    expect(res.body.grupoId).toBe(grupoId);
    meta = res.body;
  });

  test('un no miembro no puede crear una meta en ese grupo (404)', async () => {
    const res = await agentX.post('/api/metas').send({ nombre: 'Intruso', montoObjetivo: '10.00', grupoId });
    expect(res.status).toBe(404);
  });

  test('cualquier miembro aporta y el progreso es compartido', async () => {
    await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '100.00', fecha: '2026-10-01' });
    const res = await agentB.post(`/api/metas/${meta.id}/aportes`).send({ monto: '150.00', fecha: '2026-10-02' });
    expect(res.status).toBe(201);
    expect(res.body.meta).toMatchObject({ acumulado: '250.00', porcentaje: 25, restante: '750.00' });
    const lista = (await agentB.get('/api/metas')).body.find((m) => m.id === meta.id);
    expect(lista.acumulado).toBe('250.00');
  });

  test('un miembro de otro grupo no puede aportar (404) ni ve la meta', async () => {
    const res = await agentX.post(`/api/metas/${meta.id}/aportes`).send({ monto: '5.00', fecha: '2026-10-03' });
    expect(res.status).toBe(404);
    expect((await agentX.get('/api/metas')).body.find((m) => m.id === meta.id)).toBeUndefined();
  });

  test('solo el creador edita o elimina la meta de grupo', async () => {
    expect((await agentB.patch(`/api/metas/${meta.id}`).send({ nombre: 'X' })).status).toBe(404);
    expect((await agentB.delete(`/api/metas/${meta.id}`)).status).toBe(404);
  });
});
