const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const {
  Usuario, Grupo, MiembroGrupo, Categoria, Movimiento, ParticipacionGasto, Meta, AporteMeta, Notificacion, Presupuesto, PagoEntreMiembros,
} = require('../src/db/models');
const { mesesEnRango } = require('../src/modules/estadisticas/historico.calculo');
const { saldosHistoricos } = require('../src/modules/estadisticas/historico.service');

describe('mesesEnRango', () => {
  test('incluye ambos extremos y cruza el año', () => {
    expect(mesesEnRango('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
  test('24 meses ok, 25 meses error, desde > hasta error', () => {
    expect(mesesEnRango('2024-01', '2025-12')).toHaveLength(24);
    expect(() => mesesEnRango('2024-01', '2026-01')).toThrow();
    expect(() => mesesEnRango('2026-02', '2026-01')).toThrow();
  });
});

const app = createApp();
const sufijo = Date.now();
const correos = ['a', 'b'].map((x) => `hist-${x}-${sufijo}@example.com`);
const password = 'clave-segura-1';
let agentA;
let agentB;
let ids;
let grupoId;
let catComida;
let catOcio;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}
const mov = (agent, datos) => agent.post('/api/movimientos').send(datos);
const historico = (agent, desde, hasta) => agent.get(`/api/estadisticas/historico?desde=${desde}&hasta=${hasta}`);

beforeAll(async () => {
  agentA = await sesion(correos[0], 'Ana');
  agentB = await sesion(correos[1], 'Bruno');
  const us = await Usuario.findAll({ where: { email: correos } });
  const porEmail = Object.fromEntries(us.map((u) => [u.email, u.id]));
  ids = { a: porEmail[correos[0]], b: porEmail[correos[1]] };
  catComida = (await agentA.post('/api/categorias').send({ nombre: 'Comida' })).body.id;
  catOcio = (await agentA.post('/api/categorias').send({ nombre: 'Ocio' })).body.id;
  const g = await Grupo.create({ nombre: 'G', codigo: `H${String(sufijo).slice(-7)}`, creadoPor: ids.a });
  grupoId = g.id;
  await MiembroGrupo.bulkCreate([
    { grupoId, usuarioId: ids.a, rol: 'admin' },
    { grupoId, usuarioId: ids.b, rol: 'miembro' },
  ]);
});

afterAll(async () => {
  const usuarios = Object.values(ids);
  const movs = await Movimiento.findAll({ where: { usuarioId: usuarios } });
  const metas = await Meta.findAll({ where: { usuarioId: usuarios } });
  await AporteMeta.destroy({ where: { metaId: metas.map((m) => m.id) } });
  await ParticipacionGasto.destroy({ where: { movimientoId: movs.map((m) => m.id) } });
  await PagoEntreMiembros.destroy({ where: { grupoId } });
  await Movimiento.destroy({ where: { usuarioId: usuarios } });
  await Meta.destroy({ where: { usuarioId: usuarios } });
  await Notificacion.destroy({ where: { usuarioId: usuarios } });
  await Presupuesto.destroy({ where: { usuarioId: usuarios } });
  await MiembroGrupo.destroy({ where: { grupoId } });
  await Grupo.destroy({ where: { id: grupoId } });
  await Categoria.destroy({ where: { usuarioId: usuarios } });
  await Usuario.destroy({ where: { email: correos } });
  await sequelize.close();
});

test('sin sesión 401; parámetros ausentes o inválidos 400', async () => {
  expect((await request(app).get('/api/estadisticas/historico?desde=2026-01&hasta=2026-03')).status).toBe(401);
  expect((await agentA.get('/api/estadisticas/historico')).status).toBe(400);
  expect((await agentA.get('/api/estadisticas/historico?desde=2026-01')).status).toBe(400);
  expect((await historico(agentA, '2026-13', '2026-14')).status).toBe(400);
  expect((await historico(agentA, '2026-03', '2026-01')).status).toBe(400);
});

test('rango de 25 meses responde 400 y de 24 responde 200', async () => {
  expect((await historico(agentA, '2024-01', '2026-01')).status).toBe(400);
  const ok = await historico(agentA, '2024-01', '2025-12');
  expect(ok.status).toBe(200);
  expect(ok.body).toHaveLength(24);
});

test('serie de 3 meses en orden, con meses vacíos en ceros, parte propia compartida y sin escribir', async () => {
  await mov(agentA, { tipo: 'ingreso', monto: '1000.00', fecha: '2026-01-05' });
  await mov(agentA, { tipo: 'gasto', monto: '100.00', fecha: '2026-01-06', categoriaId: catComida });
  await mov(agentA, { tipo: 'gasto', monto: '20.00', fecha: '2026-01-07' });
  // compartido de 50.00 pagado por A en marzo: solo cuenta su parte (25.00), en catOcio
  const comp = await agentA.post(`/api/grupos/${grupoId}/gastos`).send({ pagadorId: ids.a, categoriaId: catOcio, monto: '50.00', fecha: '2026-03-04' });
  expect(comp.status).toBe(201);
  await mov(agentA, { tipo: 'ingreso', monto: '10.00', fecha: '2026-03-10' });
  const meta = (await agentA.post('/api/metas').send({ nombre: 'Viaje', montoObjetivo: '5000.00' })).body;
  await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '300.00', fecha: '2026-01-10' });
  await agentA.put('/api/presupuestos').send({ categoriaId: catComida, mes: '2026-01', montoLimite: '50.00' });
  const antes = await Notificacion.count({ where: { usuarioId: ids.a } });

  const res = await historico(agentA, '2026-01', '2026-03');
  expect(res.status).toBe(200);
  expect(res.body.map((x) => x.mes)).toEqual(['2026-01', '2026-02', '2026-03']);
  expect(res.body[0]).toEqual({
    mes: '2026-01', ingresos: '1000.00', gastos: '120.00', ahorroNeto: '880.00',
    gastosPorCategoria: [
      { categoriaId: catComida, nombre: 'Comida', monto: '100.00' },
      { categoriaId: null, nombre: 'Sin categoría', monto: '20.00' },
    ],
    aportesMetas: '300.00',
  });
  expect(res.body[1]).toEqual({
    mes: '2026-02', ingresos: '0.00', gastos: '0.00', ahorroNeto: '0.00', gastosPorCategoria: [], aportesMetas: '0.00',
  });
  expect(res.body[2]).toMatchObject({
    ingresos: '10.00', gastos: '25.00', ahorroNeto: '-15.00',
    gastosPorCategoria: [{ categoriaId: catOcio, nombre: 'Ocio', monto: '25.00' }],
  });
  expect(await Notificacion.count({ where: { usuarioId: ids.a } })).toBe(antes);
});

test('otro usuario no ve datos ajenos', async () => {
  const res = await historico(agentB, '2026-01', '2026-01');
  expect(res.body[0]).toMatchObject({ ingresos: '0.00', gastos: '0.00', aportesMetas: '0.00' });
});

test('saldosHistoricos acumula hasta fin de cada mes, incluye pagos y exige ser miembro', async () => {
  await PagoEntreMiembros.create({ grupoId, deudorId: ids.b, acreedorId: ids.a, monto: '10.00', fecha: '2026-04-02' });
  const r = await saldosHistoricos(ids.a, grupoId, '2026-02', '2026-04');
  expect(r.map((x) => x.mes)).toEqual(['2026-02', '2026-03', '2026-04']);
  const saldo = (fila, id) => fila.saldos.find((s) => s.usuarioId === id).saldo;
  expect(r[0].saldos.every((s) => s.saldo === '0.00')).toBe(true);
  expect(saldo(r[1], ids.a)).toBe('25.00');
  expect(saldo(r[1], ids.b)).toBe('-25.00');
  expect(saldo(r[2], ids.a)).toBe('15.00');
  expect(saldo(r[2], ids.b)).toBe('-15.00');
  const ajeno = await Usuario.create({ nombre: 'X', email: `hist-x-${sufijo}@example.com` });
  await expect(saldosHistoricos(ajeno.id, grupoId, '2026-02', '2026-02')).rejects.toThrow();
  await Usuario.destroy({ where: { id: ajeno.id } });
});
