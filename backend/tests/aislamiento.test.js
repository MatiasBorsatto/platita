const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const {
  Usuario, Categoria, Movimiento, Presupuesto, Tarjeta, Compra, Meta, AporteMeta,
  Grupo, MiembroGrupo, ParticipacionGasto, PagoEntreMiembros, Notificacion,
} = require('../src/db/models');

const app = createApp();
const sufijo = Date.now();
const correos = ['a', 'b', 'c'].map((x) => `aislamiento-${x}-${sufijo}@example.com`);
const password = 'clave-segura-1';
const noExiste = '00000000-0000-4000-8000-000000000000';
let agentA, agentB;
let idsUsuarios = [];
let idA, idC;
let recursos = {};

async function sesion(correo, nombre) {
  const agent = request.agent(app);
  await agent.post('/api/auth/registro').send({ nombre, email: correo, password });
  await agent.post('/api/auth/login').send({ email: correo, password });
  return agent;
}

beforeAll(async () => {
  agentA = await sesion(correos[0], 'Ana');
  agentB = await sesion(correos[1], 'Bruno');
  await sesion(correos[2], 'Carla');
  const us = await Usuario.findAll({ where: { email: correos } });
  idsUsuarios = us.map((u) => u.id);
  idA = us.find((u) => u.email === correos[0]).id;
  idC = us.find((u) => u.email === correos[2]).id;

  const cat = (await agentA.post('/api/categorias').send({ nombre: 'Privada A' })).body;
  const mov = await agentA
    .post('/api/movimientos')
    .send({ tipo: 'gasto', monto: '10.00', fecha: '2026-10-01', descripcion: 'privado' });
  const pres = await agentA
    .put('/api/presupuestos')
    .send({ categoriaId: cat.id, mes: '2026-10', montoLimite: '500.00' });
  const tarjeta = await agentA.post('/api/tarjetas').send({ nombre: 'Visa A', diaCierre: 10, diaVencimiento: 20 });
  const compra = await agentA.post(`/api/tarjetas/${tarjeta.body.id}/compras`).send({
    montoTotal: '300.00', cuotas: 3, modalidad: 'por_cuota', fecha: '2026-10-05', descripcion: 'tele',
  });
  const meta = await agentA.post('/api/metas').send({ nombre: 'Viaje', montoObjetivo: '1000.00' });
  const grupo = await agentA.post('/api/grupos').send({ nombre: 'Grupo A' });
  await MiembroGrupo.create({ grupoId: grupo.body.id, usuarioId: idC, rol: 'miembro' });
  const pago = await agentA.post(`/api/grupos/${grupo.body.id}/pagos`).send({
    deudorId: idC, acreedorId: idA, monto: '5.00', fecha: '2026-10-06',
  });

  for (const [nombre, res] of Object.entries({ mov, pres, tarjeta, compra, meta, grupo, pago })) {
    if (![200, 201].includes(res.status)) throw new Error(`No se pudo crear ${nombre}: ${res.status}`);
  }
  recursos = {
    movimiento: mov.body, presupuesto: pres.body, tarjeta: tarjeta.body,
    compra: compra.body, meta: meta.body, grupo: grupo.body, pago: pago.body,
  };
});

afterAll(async () => {
  const movs = await Movimiento.findAll({ where: { usuarioId: idsUsuarios } });
  await ParticipacionGasto.destroy({ where: { movimientoId: movs.map((m) => m.id) } });
  const metas = await Meta.findAll({ where: { usuarioId: idsUsuarios } });
  await AporteMeta.destroy({ where: { metaId: metas.map((m) => m.id) } });
  await Movimiento.destroy({ where: { usuarioId: idsUsuarios } });
  await Presupuesto.destroy({ where: { usuarioId: idsUsuarios } });
  await Compra.destroy({ where: { usuarioId: idsUsuarios } });
  await Tarjeta.destroy({ where: { usuarioId: idsUsuarios } });
  await Meta.destroy({ where: { usuarioId: idsUsuarios } });
  await Categoria.destroy({ where: { usuarioId: idsUsuarios } });
  if (recursos.grupo) {
    await PagoEntreMiembros.destroy({ where: { grupoId: recursos.grupo.id } });
    await MiembroGrupo.destroy({ where: { grupoId: recursos.grupo.id } });
    await Grupo.destroy({ where: { id: recursos.grupo.id } });
  }
  await Notificacion.destroy({ where: { usuarioId: idsUsuarios } });
  await Usuario.destroy({ where: { email: correos } });
  await sequelize.close();
});

describe('aislamiento entre usuarios: B recibe 404 en los recursos de A', () => {
  test('movimiento', async () => {
    const id = recursos.movimiento.id;
    expect((await agentB.patch(`/api/movimientos/${id}`).send({ monto: '1.00' })).status).toBe(404);
    expect((await agentB.delete(`/api/movimientos/${id}`)).status).toBe(404);
    expect(await Movimiento.count({ where: { id } })).toBe(1);
    const lista = await agentB.get('/api/movimientos?limit=100');
    expect(lista.body.items.map((m) => m.id)).not.toContain(id);
  });

  test('presupuesto', async () => {
    const id = recursos.presupuesto.id;
    expect((await agentB.delete(`/api/presupuestos/${id}`)).status).toBe(404);
    expect(await Presupuesto.count({ where: { id } })).toBe(1);
    const lista = await agentB.get('/api/presupuestos?mes=2026-10');
    expect(lista.body.map((p) => p.id)).not.toContain(id);
  });

  test('tarjeta', async () => {
    const id = recursos.tarjeta.id;
    expect((await agentA.get(`/api/tarjetas/${id}/resumen?mes=2026-10`)).status).toBe(200);
    expect((await agentB.patch(`/api/tarjetas/${id}`).send({ nombre: 'Robada' })).status).toBe(404);
    expect((await agentB.delete(`/api/tarjetas/${id}`)).status).toBe(404);
    expect((await agentB.get(`/api/tarjetas/${id}/resumen?mes=2026-10`)).status).toBe(404);
    expect(await Tarjeta.count({ where: { id } })).toBe(1);
  });

  test('compra: no se puede cargar ni pagar sobre la tarjeta de A', async () => {
    const tarjetaId = recursos.tarjeta.id;
    const res = await agentB.post(`/api/tarjetas/${tarjetaId}/compras`).send({
      montoTotal: '50.00', cuotas: 1, modalidad: 'compra_completa', fecha: '2026-10-07', descripcion: 'intruso',
    });
    expect(res.status).toBe(404);
    const pago = await agentB.post(`/api/tarjetas/${tarjetaId}/pagos`).send({ monto: '10.00', fecha: '2026-10-08' });
    expect(pago.status).toBe(404);
    expect(await Compra.count({ where: { tarjetaId } })).toBe(1);
  });

  test('meta', async () => {
    const id = recursos.meta.id;
    expect((await agentB.patch(`/api/metas/${id}`).send({ nombre: 'Robada' })).status).toBe(404);
    const aporte = await agentB.post(`/api/metas/${id}/aportes`).send({ monto: '10.00', fecha: '2026-10-09' });
    expect(aporte.status).toBe(404);
    expect((await agentB.delete(`/api/metas/${id}`)).status).toBe(404);
    expect(await Meta.count({ where: { id } })).toBe(1);
    expect(await AporteMeta.count({ where: { metaId: id } })).toBe(0);
  });

  test('grupo', async () => {
    const id = recursos.grupo.id;
    expect((await agentA.get(`/api/grupos/${id}`)).status).toBe(200);
    expect((await agentA.get(`/api/grupos/${id}/saldos`)).status).toBe(200);
    expect((await agentB.get(`/api/grupos/${id}`)).status).toBe(404);
    const gasto = await agentB.post(`/api/grupos/${id}/gastos`).send({
      pagadorId: idA, monto: '10.00', fecha: '2026-10-01', descripcion: 'x',
    });
    expect(gasto.status).toBe(404);
    expect((await agentB.post(`/api/grupos/${id}/invitaciones`).send({ email: correos[1] })).status).toBe(404);
    expect((await agentB.get(`/api/grupos/${id}/saldos`)).status).toBe(404);
    const lista = await agentB.get('/api/grupos');
    expect(lista.body.map((g) => g.id)).not.toContain(id);
  });

  test('pago', async () => {
    const id = recursos.grupo.id;
    expect(await PagoEntreMiembros.count({ where: { grupoId: id } })).toBe(1);
    const propios = await agentA.get(`/api/grupos/${id}/pagos`);
    expect(propios.status).toBe(200);
    expect(propios.body).toHaveLength(1);
    expect((await agentB.get(`/api/grupos/${id}/pagos`)).status).toBe(404);
    const res = await agentB.post(`/api/grupos/${id}/pagos`).send({
      deudorId: idC, acreedorId: idA, monto: '5.00', fecha: '2026-10-06',
    });
    expect(res.status).toBe(404);
    expect(await PagoEntreMiembros.count({ where: { grupoId: id } })).toBe(1);
  });

  test('un id inexistente también responde 404', async () => {
    expect((await agentB.delete(`/api/movimientos/${noExiste}`)).status).toBe(404);
  });
});
