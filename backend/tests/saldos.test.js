const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { calcularSaldos } = require('../src/modules/saldos/saldos.calculo');
const { ErrorInterno } = require('../src/utils/errores');
const {
  Usuario, Grupo, MiembroGrupo, Movimiento, ParticipacionGasto, PagoEntreMiembros,
} = require('../src/db/models');

describe('calcularSaldos (puro)', () => {
  test('ejemplo de la especificación: A pagó 100, B debe 50', () => {
    const s = calcularSaldos({
      pagadoPorUsuario: { A: '100.00' },
      participacionPorUsuario: { A: '50.00', B: '50.00' },
      pagosRealizados: {},
      pagosRecibidos: {},
    });
    expect(s.get('A')).toBe('50.00');
    expect(s.get('B')).toBe('-50.00');
  });

  test('después de que B paga 50 a A, ambos quedan en 0.00', () => {
    const s = calcularSaldos({
      pagadoPorUsuario: { A: '100.00' },
      participacionPorUsuario: { A: '50.00', B: '50.00' },
      pagosRealizados: { B: '50.00' },
      pagosRecibidos: { A: '50.00' },
    });
    expect(s.get('A')).toBe('0.00');
    expect(s.get('B')).toBe('0.00');
  });

  test('suma de saldos distinta de cero lanza ErrorInterno', () => {
    expect(() =>
      calcularSaldos({
        pagadoPorUsuario: { A: '100.00' },
        participacionPorUsuario: { A: '50.00', B: '40.00' },
        pagosRealizados: {},
        pagosRecibidos: {},
      })
    ).toThrow(ErrorInterno);
  });

  test('es exacto en centavos (33.34 + 33.33 + 33.33)', () => {
    const s = calcularSaldos({
      pagadoPorUsuario: { A: '100.00' },
      participacionPorUsuario: { A: '33.34', B: '33.33', C: '33.33' },
      pagosRealizados: {},
      pagosRecibidos: {},
    });
    expect(s.get('A')).toBe('66.66');
    expect(s.get('B')).toBe('-33.33');
    expect(s.get('C')).toBe('-33.33');
  });
});

const app = createApp();
const sufijo = Date.now();
const correos = ['a', 'b', 'c', 'x'].map((x) => `saldos-${x}-${sufijo}@example.com`);
const password = 'clave-segura-1';
let agentA, agentB, agentX;
let ids = {};
let grupoId;

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
  agentX = await sesion(correos[3], 'Xavi');
  const us = await Usuario.findAll({ where: { email: correos } });
  const porEmail = Object.fromEntries(us.map((u) => [u.email, u.id]));
  ids = { a: porEmail[correos[0]], b: porEmail[correos[1]], c: porEmail[correos[2]], x: porEmail[correos[3]] };
  const g = await Grupo.create({ nombre: 'Saldos', codigo: `S${String(sufijo).slice(-7)}`, creadoPor: ids.a });
  grupoId = g.id;
  await MiembroGrupo.bulkCreate([
    { grupoId, usuarioId: ids.a, rol: 'admin' },
    { grupoId, usuarioId: ids.b, rol: 'miembro' },
    { grupoId, usuarioId: ids.c, rol: 'miembro' },
  ]);
});

afterAll(async () => {
  const movs = await Movimiento.findAll({ where: { grupoId } });
  await ParticipacionGasto.destroy({ where: { movimientoId: movs.map((m) => m.id) } });
  await Movimiento.destroy({ where: { grupoId } });
  await PagoEntreMiembros.destroy({ where: { grupoId } });
  await MiembroGrupo.destroy({ where: { grupoId } });
  await Grupo.destroy({ where: { id: grupoId } });
  await Usuario.destroy({ where: { email: correos } });
  await sequelize.close();
});

const saldoDe = (body, id) => body.find((s) => s.usuarioId === id).saldo;

describe('saldos y pagos por API', () => {
  test('saldos iniciales en 0.00 para todos los miembros', async () => {
    const res = await agentA.get(`/api/grupos/${grupoId}/saldos`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    res.body.forEach((s) => expect(s.saldo).toBe('0.00'));
  });

  test('gasto compartido de A (100 entre A y B) y pago de B a A', async () => {
    const g = await agentA.post(`/api/grupos/${grupoId}/gastos`).send({
      pagadorId: ids.a, monto: '100.00', fecha: '2026-10-01',
      participantes: [{ usuarioId: ids.a, monto: '50.00' }, { usuarioId: ids.b, monto: '50.00' }],
    });
    expect(g.status).toBe(201);

    let res = await agentB.get(`/api/grupos/${grupoId}/saldos`);
    expect(saldoDe(res.body, ids.a)).toBe('50.00');
    expect(saldoDe(res.body, ids.b)).toBe('-50.00');
    expect(saldoDe(res.body, ids.c)).toBe('0.00');

    const pago = await agentB.post(`/api/grupos/${grupoId}/pagos`).send({
      deudorId: ids.b, acreedorId: ids.a, monto: '20.00', fecha: '2026-10-02', nota: 'Parcial',
    });
    expect(pago.status).toBe(201);
    expect(pago.body.monto).toBe('20.00');

    res = await agentA.get(`/api/grupos/${grupoId}/saldos`);
    expect(saldoDe(res.body, ids.a)).toBe('30.00');
    expect(saldoDe(res.body, ids.b)).toBe('-30.00');

    const lista = await agentA.get(`/api/grupos/${grupoId}/pagos`);
    expect(lista.status).toBe(200);
    expect(lista.body).toHaveLength(1);
    expect(lista.body[0].nota).toBe('Parcial');
  });

  test('pago entre el mismo usuario es 400', async () => {
    const res = await agentA.post(`/api/grupos/${grupoId}/pagos`).send({
      deudorId: ids.a, acreedorId: ids.a, monto: '5.00', fecha: '2026-10-02',
    });
    expect(res.status).toBe(400);
  });

  test('pago con un no miembro es 400', async () => {
    const res = await agentA.post(`/api/grupos/${grupoId}/pagos`).send({
      deudorId: ids.x, acreedorId: ids.a, monto: '5.00', fecha: '2026-10-02',
    });
    expect(res.status).toBe(400);
  });

  test('monto inválido es 400', async () => {
    const res = await agentA.post(`/api/grupos/${grupoId}/pagos`).send({
      deudorId: ids.b, acreedorId: ids.a, monto: '-5', fecha: '2026-10-02',
    });
    expect(res.status).toBe(400);
  });

  test('un no miembro recibe 404 en saldos y pagos', async () => {
    expect((await agentX.get(`/api/grupos/${grupoId}/saldos`)).status).toBe(404);
    expect((await agentX.get(`/api/grupos/${grupoId}/pagos`)).status).toBe(404);
    const res = await agentX.post(`/api/grupos/${grupoId}/pagos`).send({
      deudorId: ids.x, acreedorId: ids.a, monto: '5.00', fecha: '2026-10-02',
    });
    expect(res.status).toBe(404);
  });
});
