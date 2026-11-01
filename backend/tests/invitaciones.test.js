const request = require('supertest');
const crypto = require('crypto');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Grupo, MiembroGrupo } = require('../src/db/models');
const Invitacion = require('../src/db/models/invitacion');
const email = require('../src/services/email');

const app = createApp();
const sufijo = Date.now();
const correos = ['a', 'b', 'c'].map((x) => `invit-${x}-${sufijo}@example.com`);
const password = 'clave-segura-1';
let agentA;
let agentB;
let agentC;
let espia;
let grupo;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

function tokenEnviado() {
  const texto = espia.mock.calls[espia.mock.calls.length - 1][0].texto;
  return /token=([0-9a-f]+)/.exec(texto)[1];
}

async function invitar(correo) {
  const res = await agentA.post(`/api/grupos/${grupo.id}/invitaciones`).send({ email: correo });
  expect(res.status).toBe(201);
  return res.body;
}

beforeAll(async () => {
  espia = jest.spyOn(email, 'enviarEmail').mockResolvedValue();
  agentA = await sesion(correos[0], 'Ana');
  agentB = await sesion(correos[1], 'Bruno');
  agentC = await sesion(correos[2], 'Carla');
  grupo = (await agentA.post('/api/grupos').send({ nombre: 'Invitaciones' })).body;
});

afterAll(async () => {
  espia.mockRestore();
  const usuarios = await Usuario.findAll({ where: { email: correos } });
  const ids = usuarios.map((u) => u.id);
  await Invitacion.destroy({ where: { grupoId: grupo.id } });
  await MiembroGrupo.destroy({ where: { usuarioId: ids } });
  await Grupo.destroy({ where: { creadoPor: ids } });
  await Usuario.destroy({ where: { email: correos } });
  await sequelize.close();
});

describe('invitaciones', () => {
  test('invitación vencida responde 400', async () => {
    const inv = await invitar(correos[1]);
    const token = tokenEnviado();
    await Invitacion.update({ expiraEn: new Date(Date.now() - 1000) }, { where: { id: inv.id } });
    const res = await agentB.post('/api/invitaciones/aceptar').send({ token });
    expect(res.status).toBe(400);
    expect(await MiembroGrupo.count({ where: { grupoId: grupo.id } })).toBe(1);
  });

  test('aceptar con otro email responde 403', async () => {
    await invitar(correos[1]);
    const token = tokenEnviado();
    const res = await agentC.post('/api/invitaciones/aceptar').send({ token });
    expect(res.status).toBe(403);
  });

  test('aceptar con el email correcto crea el miembro, marca aceptada y es de un solo uso', async () => {
    const inv = await invitar(correos[1].toUpperCase());
    const token = tokenEnviado();
    const guardada = await Invitacion.findByPk(inv.id);
    expect(guardada.token).toBe(crypto.createHash('sha256').update(token).digest('hex'));
    expect(guardada.token).not.toBe(token);

    const res = await agentB.post('/api/invitaciones/aceptar').send({ token });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(grupo.id);
    expect((await Invitacion.findByPk(inv.id)).estado).toBe('aceptada');
    const usuarioB = await Usuario.findOne({ where: { email: correos[1] } });
    const miembro = await MiembroGrupo.findOne({ where: { grupoId: grupo.id, usuarioId: usuarioB.id } });
    expect(miembro.rol).toBe('miembro');

    const otra = await agentB.post('/api/invitaciones/aceptar').send({ token });
    expect(otra.status).toBe(400);
  });

  test('solo un admin puede invitar (403) y el email debe ser válido (400)', async () => {
    const res = await agentB.post(`/api/grupos/${grupo.id}/invitaciones`).send({ email: correos[2] });
    expect(res.status).toBe(403);
    const mal = await agentA.post(`/api/grupos/${grupo.id}/invitaciones`).send({ email: 'no-es-email' });
    expect(mal.status).toBe(400);
  });

  test('invitar a quien ya es miembro responde 409', async () => {
    const res = await agentA.post(`/api/grupos/${grupo.id}/invitaciones`).send({ email: correos[1] });
    expect(res.status).toBe(409);
  });

  test('un admin cancela y el token deja de servir; un no admin no puede', async () => {
    const inv = await invitar(correos[2]);
    const token = tokenEnviado();
    expect((await agentB.delete(`/api/grupos/${grupo.id}/invitaciones/${inv.id}`)).status).toBe(403);
    expect((await agentA.delete(`/api/grupos/${grupo.id}/invitaciones/${inv.id}`)).status).toBe(204);
    expect((await Invitacion.findByPk(inv.id)).estado).toBe('cancelada');
    const res = await agentC.post('/api/invitaciones/aceptar').send({ token });
    expect(res.status).toBe(400);
  });

  test('un fallo del envío no rompe la invitación', async () => {
    espia.mockRejectedValueOnce(new Error('smtp caído'));
    const errores = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await agentA.post(`/api/grupos/${grupo.id}/invitaciones`).send({ email: correos[2] });
    expect(res.status).toBe(201);
    await new Promise((r) => setImmediate(r));
    errores.mockRestore();
  });
});
