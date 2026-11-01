const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const {
  Usuario, Grupo, MiembroGrupo, Categoria, Movimiento, ParticipacionGasto, Meta, AporteMeta, Presupuesto, Tarjeta, Notificacion,
} = require('../src/db/models');
const { calcularResumen } = require('../src/modules/estadisticas/resumenMensual.calculo');

const l = (tipo, monto, categoriaId = null, nombre = null) => ({ tipo, monto, categoriaId, nombre });

describe('calcularResumen', () => {
  test('ingresos 100000 y gastos 60000 dan ahorroNeto 40000.00', () => {
    const r = calcularResumen([l('ingreso', '100000.00'), l('gasto', '60000.00', 'c1', 'Comida')], []);
    expect(r).toMatchObject({ ingresos: '100000.00', gastos: '60000.00', ahorroNeto: '40000.00' });
  });

  test('un pago_tarjeta no altera ingresos, gastos ni categorias', () => {
    const base = [l('ingreso', '100.00'), l('gasto', '30.00', 'c1', 'Comida')];
    const sin = calcularResumen(base, []);
    const con = calcularResumen([...base, l('pago_tarjeta', '500.00')], []);
    expect(con).toEqual(sin);
  });

  test('ahorroNeto negativo y suma exacta en centavos', () => {
    const r = calcularResumen([l('ingreso', '0.10'), l('gasto', '0.20'), l('gasto', '0.01')], []);
    expect(r.gastos).toBe('0.21');
    expect(r.ahorroNeto).toBe('-0.11');
  });

  test('agrupa por categoria, con bucket Sin categoría, ordenado por monto desc', () => {
    const r = calcularResumen(
      [l('gasto', '10.00', 'c1', 'Comida'), l('gasto', '5.50', 'c1', 'Comida'), l('gasto', '2.00'), l('gasto', '20.00', 'c2', 'Ocio')],
      []
    );
    expect(r.gastosPorCategoria).toEqual([
      { categoriaId: 'c2', nombre: 'Ocio', monto: '20.00' },
      { categoriaId: 'c1', nombre: 'Comida', monto: '15.50' },
      { categoriaId: null, nombre: 'Sin categoría', monto: '2.00' },
    ]);
  });

  test('sin movimientos todo es cero', () => {
    expect(calcularResumen([], [])).toEqual({
      ingresos: '0.00', gastos: '0.00', ahorroNeto: '0.00', gastosPorCategoria: [], presupuestos: [],
    });
  });
});

const app = createApp();
const sufijo = Date.now();
const correos = ['a', 'b'].map((x) => `resm-${x}-${sufijo}@example.com`);
const password = 'clave-segura-1';
let agentA;
let agentB;
let ids;
let grupoId;
let catComida;
let catOcio;
let catBruno;

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

const mov = (agent, datos) => agent.post('/api/movimientos').send(datos);
const mensual = (agent, mes = '2026-10') => agent.get(`/api/estadisticas/mensual?mes=${mes}`);

beforeAll(async () => {
  agentA = await sesion(correos[0], 'Ana');
  agentB = await sesion(correos[1], 'Bruno');
  const us = await Usuario.findAll({ where: { email: correos } });
  const porEmail = Object.fromEntries(us.map((u) => [u.email, u.id]));
  ids = { a: porEmail[correos[0]], b: porEmail[correos[1]] };
  catComida = (await agentA.post('/api/categorias').send({ nombre: 'Comida' })).body.id;
  catOcio = (await agentA.post('/api/categorias').send({ nombre: 'Ocio' })).body.id;
  catBruno = (await agentB.post('/api/categorias').send({ nombre: 'Cat de Bruno' })).body.id;
  const g = await Grupo.create({ nombre: 'G', codigo: `R${String(sufijo).slice(-7)}`, creadoPor: ids.a });
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
  await Movimiento.destroy({ where: { usuarioId: usuarios } });
  await Meta.destroy({ where: { usuarioId: usuarios } });
  await Notificacion.destroy({ where: { usuarioId: usuarios } });
  await Presupuesto.destroy({ where: { usuarioId: usuarios } });
  await Tarjeta.destroy({ where: { usuarioId: usuarios } });
  await MiembroGrupo.destroy({ where: { grupoId } });
  await Grupo.destroy({ where: { id: grupoId } });
  await Categoria.destroy({ where: { usuarioId: usuarios } });
  await Usuario.destroy({ where: { email: correos } });
  await sequelize.close();
});

test('sin sesión 401; mes ausente o inválido 400', async () => {
  expect((await request(app).get('/api/estadisticas/mensual?mes=2026-10')).status).toBe(401);
  expect((await agentA.get('/api/estadisticas/mensual')).status).toBe(400);
  expect((await agentA.get('/api/estadisticas/mensual?mes=2026-13')).status).toBe(400);
});

test('mes vacío devuelve ceros', async () => {
  const res = await mensual(agentA, '2025-01');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({
    mes: '2025-01', ingresos: '0.00', gastos: '0.00', ahorroNeto: '0.00',
    gastosPorCategoria: [], presupuestos: [], aportesMetas: '0.00',
  });
});

test('integra personales, parte compartida propia, pago_tarjeta, aportes y presupuestos', async () => {
  await mov(agentA, { tipo: 'ingreso', monto: '1000.00', fecha: '2026-10-01' });
  await mov(agentA, { tipo: 'gasto', monto: '100.00', fecha: '2026-10-02', categoriaId: catComida });
  await mov(agentA, { tipo: 'gasto', monto: '20.00', fecha: '2026-10-03' });
  await mov(agentA, { tipo: 'gasto', monto: '999.00', fecha: '2026-11-01', categoriaId: catComida }); // otro mes
  // A paga entero un compartido de 50.00 (mitad c/u): solo cuenta su parte 25.00, en catOcio.
  const comp = await agentA.post(`/api/grupos/${grupoId}/gastos`).send({ pagadorId: ids.a, categoriaId: catOcio, monto: '50.00', fecha: '2026-10-04' });
  expect(comp.status).toBe(201);
  // B crea y paga un compartido de 30.00: A participa con 15.00.
  const comp2 = await agentB.post(`/api/grupos/${grupoId}/gastos`).send({ pagadorId: ids.b, categoriaId: catBruno, monto: '30.00', fecha: '2026-10-05' });
  expect(comp2.status).toBe(201);
  const tarjeta = await Tarjeta.create({ usuarioId: ids.a, nombre: 'Visa', diaCierre: 20, diaVencimiento: 5 });
  await agentA.post(`/api/tarjetas/${tarjeta.id}/pagos`).send({ monto: '500.00', fecha: '2026-10-21' });
  const meta = (await agentA.post('/api/metas').send({ nombre: 'Viaje', montoObjetivo: '5000.00' })).body;
  await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '300.00', fecha: '2026-10-10' });
  await agentA.post(`/api/metas/${meta.id}/aportes`).send({ monto: '70.00', fecha: '2026-09-10' });
  await agentA.put('/api/presupuestos').send({ categoriaId: catComida, mes: '2026-10', montoLimite: '200.00' });

  const res = await mensual(agentA);
  expect(res.status).toBe(200);
  expect(res.body.mes).toBe('2026-10');
  expect(res.body.ingresos).toBe('1000.00');
  // 100 + 20 personales + 25 (su parte del que pago) + 15 (su parte del de B) = 160.00
  expect(res.body.gastos).toBe('160.00');
  expect(res.body.ahorroNeto).toBe('840.00');
  expect(res.body.aportesMetas).toBe('300.00');
  const porCat = res.body.gastosPorCategoria;
  expect(porCat.find((c) => c.categoriaId === catComida)).toEqual({ categoriaId: catComida, nombre: 'Comida', monto: '100.00' });
  expect(porCat.find((c) => c.categoriaId === catOcio)).toEqual({ categoriaId: catOcio, nombre: 'Ocio', monto: '25.00' });
  // El resto (20.00 personal sin categoría + 15.00 de B sin categoría propia de A) va a "Sin categoría".
  const sin = porCat.find((c) => c.categoriaId === null);
  expect(sin.nombre).toBe('Sin categoría');
  expect(sin.monto).toBe('35.00');
  expect(res.body.presupuestos).toHaveLength(1);
  expect(res.body.presupuestos[0]).toMatchObject({ categoriaId: catComida, consumido: '100.00', restante: '100.00' });
});

test('los datos de otro usuario no aparecen (B solo ve lo suyo)', async () => {
  const res = await mensual(agentB);
  expect(res.body.ingresos).toBe('0.00');
  // Su parte de ambos compartidos: 25.00 + 15.00.
  expect(res.body.gastos).toBe('40.00');
  expect(res.body.aportesMetas).toBe('0.00');
  expect(res.body.gastosPorCategoria.map((c) => c.nombre)).not.toContain('Comida');
});

test('GET mensual no escribe notificaciones aunque un presupuesto supere el 100%', async () => {
  // catOcio ya tiene 25.00 de gasto en 2026-10; con limite 10.00 esta al 250%.
  await agentA.put('/api/presupuestos').send({ categoriaId: catOcio, mes: '2026-10', montoLimite: '10.00', regla: 'con_compartidos' });
  const antes = await Notificacion.count({ where: { usuarioId: ids.a } });
  const res = await mensual(agentA);
  expect(res.status).toBe(200);
  expect(res.body.presupuestos.find((p) => p.categoriaId === catOcio).alerta).toBe('100');
  expect(await Notificacion.count({ where: { usuarioId: ids.a } })).toBe(antes);
});
