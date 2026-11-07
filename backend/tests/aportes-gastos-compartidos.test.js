const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const {
  Usuario, Grupo, MiembroGrupo, Movimiento, ParticipacionGasto, AporteGasto,
} = require('../src/db/models');
const { hoyBA, sumarDias } = require('../src/utils/fechas');

const app = createApp();
const sufijo = Date.now();
const correos = ['a', 'b', 'c'].map((x) => `aportes-${x}-${sufijo}@example.com`);
const password = 'clave-segura-1';
const hoy = hoyBA();
const manana = sumarDias(hoy, 1);

let agentA;
let agentB;
let agentC;
let ids;
let grupoId;
let gastoId;
let aporteAId;
let aporteBId;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ fechaNacimiento: '1990-01-01', nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

function saldoDe(filas, usuarioId) {
  return filas.find((f) => f.usuarioId === usuarioId).saldo;
}

beforeAll(async () => {
  agentA = await sesion(correos[0], 'Ana');
  agentB = await sesion(correos[1], 'Bruno');
  agentC = await sesion(correos[2], 'Carla');
  const us = await Usuario.findAll({ where: { email: correos } });
  const porEmail = Object.fromEntries(us.map((u) => [u.email, u.id]));
  ids = { a: porEmail[correos[0]], b: porEmail[correos[1]], c: porEmail[correos[2]] };
  const grupo = await Grupo.create({
    nombre: 'Depto',
    codigo: `P${String(sufijo).slice(-7)}`,
    creadoPor: ids.a,
  });
  grupoId = grupo.id;
  await MiembroGrupo.bulkCreate([
    { grupoId, usuarioId: ids.a, rol: 'admin' },
    { grupoId, usuarioId: ids.b, rol: 'miembro' },
    { grupoId, usuarioId: ids.c, rol: 'miembro' },
  ]);
});

afterAll(async () => {
  if (ids) {
    const usuarios = Object.values(ids);
    const movs = await Movimiento.findAll({ where: { usuarioId: usuarios } });
    const movIds = movs.map((m) => m.id);
    await ParticipacionGasto.destroy({ where: { movimientoId: movIds } });
    await AporteGasto.destroy({ where: { movimientoId: movIds } });
    await Movimiento.destroy({ where: { usuarioId: usuarios } });
    if (grupoId) {
      await MiembroGrupo.destroy({ where: { grupoId } });
      await Grupo.destroy({ where: { id: grupoId } });
    }
    await Usuario.destroy({ where: { email: correos } });
  }
  await sequelize.close();
});

test('el gasto compartido se divide por integrantes y registra la parte propia', async () => {
  const res = await agentA
    .post(`/api/grupos/${grupoId}/gastos`)
    .send({ monto: '300.00', fecha: hoy, descripcion: 'Asado' });
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ tipo: 'gasto', alcance: 'compartido', grupoId, monto: '300.00' });
  expect(res.body.participaciones.map((p) => p.monto).sort()).toEqual(['100.00', '100.00', '100.00']);
  expect(res.body.aportes).toHaveLength(1);
  expect(res.body.aportes[0]).toMatchObject({ usuarioId: ids.a, monto: '100.00', fecha: hoy });
  expect(res.body.totalAportado).toBe('100.00');
  expect(res.body.faltaCubrir).toBe('200.00');
  gastoId = res.body.id;
  aporteAId = res.body.aportes[0].id;

  const saldos = await agentA.get(`/api/grupos/${grupoId}/saldos`);
  expect(saldos.status).toBe(200);
  expect(saldoDe(saldos.body, ids.a)).toBe('0.00');
  expect(saldoDe(saldos.body, ids.b)).toBe('-100.00');
  expect(saldoDe(saldos.body, ids.c)).toBe('-100.00');
});

test('cada miembro registra sus aportes; el creador puede registrar los ajenos', async () => {
  const propio = await agentB
    .post(`/api/grupos/${grupoId}/gastos/${gastoId}/aportes`)
    .send({ monto: '100.00', fecha: hoy });
  expect(propio.status).toBe(201);
  expect(propio.body).toMatchObject({ usuarioId: ids.b, monto: '100.00', fecha: hoy });
  aporteBId = propio.body.id;

  const lista = await agentB.get(`/api/grupos/${grupoId}/gastos`);
  const item = lista.body.items.find((g) => g.id === gastoId);
  expect(item.totalAportado).toBe('200.00');
  expect(item.faltaCubrir).toBe('100.00');

  const aCargoDeC = await agentB
    .post(`/api/grupos/${grupoId}/gastos/${gastoId}/aportes`)
    .send({ usuarioId: ids.c, monto: '50.00' });
  expect(aCargoDeC.status).toBe(403);

  const borrarAjena = await agentB.delete(`/api/grupos/${grupoId}/gastos/${gastoId}/aportes/${aporteAId}`);
  expect(borrarAjena.status).toBe(403);

  // El creador sí puede registrar y borrar aportes de otras personas.
  const ajeno = await agentA
    .post(`/api/grupos/${grupoId}/gastos/${gastoId}/aportes`)
    .send({ usuarioId: ids.c, monto: '10.00' });
  expect(ajeno.status).toBe(201);
  expect(ajeno.body).toMatchObject({ usuarioId: ids.c, monto: '10.00' });
  expect((await agentA.delete(`/api/grupos/${grupoId}/gastos/${gastoId}/aportes/${ajeno.body.id}`)).status).toBe(204);

  const borrarPropia = await agentB.delete(`/api/grupos/${grupoId}/gastos/${gastoId}/aportes/${aporteBId}`);
  expect(borrarPropia.status).toBe(204);
  const sinAporteB = await agentA.get(`/api/grupos/${grupoId}/gastos`);
  expect(sinAporteB.body.items.find((g) => g.id === gastoId).faltaCubrir).toBe('200.00');

  const reintento = await agentB
    .post(`/api/grupos/${grupoId}/gastos/${gastoId}/aportes`)
    .send({ monto: '100.00', fecha: hoy });
  expect(reintento.status).toBe(201);
  aporteBId = reintento.body.id;
});

test('si falta cubrir, el creador puede completar la deuda y los saldos lo reflejan', async () => {
  // Carla avisa que no puede poner su parte: Ana cubre el faltante.
  const cubre = await agentA
    .post(`/api/grupos/${grupoId}/gastos/${gastoId}/aportes`)
    .send({ monto: '100.00', fecha: hoy });
  expect(cubre.status).toBe(201);

  const lista = await agentA.get(`/api/grupos/${grupoId}/gastos`);
  const item = lista.body.items.find((g) => g.id === gastoId);
  expect(item.aportes).toHaveLength(3);
  expect(item.totalAportado).toBe('300.00');
  expect(item.faltaCubrir).toBe('0.00');

  const saldos = await agentA.get(`/api/grupos/${grupoId}/saldos`);
  expect(saldoDe(saldos.body, ids.a)).toBe('100.00');
  expect(saldoDe(saldos.body, ids.b)).toBe('0.00');
  expect(saldoDe(saldos.body, ids.c)).toBe('-100.00');
});

test('Mi plata descuenta los aportes reales, no solo la parte teórica', async () => {
  await agentA.post('/api/movimientos').send({ tipo: 'ingreso', monto: '1000.00', fecha: hoy });
  await agentA.post('/api/movimientos').send({ tipo: 'gasto', monto: '50.00', fecha: hoy });
  await agentA.post('/api/movimientos').send({ tipo: 'ingreso', monto: '999.00', fecha: manana });

  const a = await agentA.get('/api/movimientos/dinero-actual');
  expect(a.status).toBe(200);
  expect(a.body).toMatchObject({
    dineroActual: '750.00',
    ingresos: '1000.00',
    gastos: '250.00',
    gastosPersonales: '50.00',
    gastosCompartidos: '200.00',
    fechaCorte: hoy,
  });

  const b = await agentB.get('/api/movimientos/dinero-actual');
  expect(b.body).toMatchObject({ dineroActual: '-100.00', gastosCompartidos: '100.00', gastosPersonales: '0.00' });

  const c = await agentC.get('/api/movimientos/dinero-actual');
  expect(c.body).toMatchObject({ dineroActual: '0.00', gastosCompartidos: '0.00' });
});

test('editar el reparto no borra los aportes reales y valida montos', async () => {
  const res = await agentA
    .patch(`/api/grupos/${grupoId}/gastos/${gastoId}`)
    .send({
      monto: '360.00',
      participantes: [
        { usuarioId: ids.a, monto: '120.00' },
        { usuarioId: ids.b, monto: '120.00' },
        { usuarioId: ids.c, monto: '120.00' },
      ],
    });
  expect(res.status).toBe(200);
  expect(res.body.monto).toBe('360.00');
  expect(res.body.totalAportado).toBe('300.00');
  expect(res.body.faltaCubrir).toBe('60.00');
  expect(res.body.aportes.map((a) => a.monto).sort()).toEqual(['100.00', '100.00', '100.00']);

  const invalido = await agentB
    .post(`/api/grupos/${grupoId}/gastos/${gastoId}/aportes`)
    .send({ monto: '0' });
  expect(invalido.status).toBe(400);
  const sinMonto = await agentB
    .post(`/api/grupos/${grupoId}/gastos/${gastoId}/aportes`)
    .send({});
  expect(sinMonto.status).toBe(400);
});
