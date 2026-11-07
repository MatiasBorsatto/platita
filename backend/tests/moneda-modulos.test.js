const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, MiembroGrupo } = require('../src/db/models');

// Moneda en los módulos: gastos compartidos, saldos, metas y pagos. Nunca se mezclan monedas.
const app = createApp();
const sufijo = Date.now();
const clave = 'clave-moneda-modulos-9';
const creados = [];

async function usuario(nombre) {
  const email = `moneda-${nombre}-${sufijo}@example.com`;
  await request(app).post('/api/auth/registro').send({ nombre, email, password: clave, fechaNacimiento: '1985-02-02' });
  const u = await Usuario.findOne({ where: { email } });
  creados.push(u.id);
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: clave });
  return { id: u.id, agent };
}

afterAll(async () => {
  await Usuario.destroy({ where: { id: creados } });
  await sequelize.close();
});

describe('moneda en los módulos', () => {
  let ana;
  let beto;
  let grupoId;

  beforeAll(async () => {
    ana = await usuario('ana');
    beto = await usuario('beto');
    grupoId = (await ana.agent.post('/api/grupos').send({ nombre: `Monedas ${sufijo}` })).body.id;
    await MiembroGrupo.create({ grupoId, usuarioId: beto.id, rol: 'miembro' });
  });

  test('un gasto compartido en dólares no se suma a los saldos en pesos', async () => {
    await ana.agent.post(`/api/grupos/${grupoId}/gastos`).send({ monto: '100.00', fecha: '2026-06-10', descripcion: 'pesos' });
    await ana.agent.post(`/api/grupos/${grupoId}/gastos`).send({ monto: '50.00', fecha: '2026-06-11', descripcion: 'dolares', moneda: 'USD' });
    const saldos = await ana.agent.get(`/api/grupos/${grupoId}/saldos`);
    expect(saldos.status).toBe(200);
    // Cada moneda tiene sus propias filas: ninguna cifra en dólares aparece en pesos.
    const monedas = [...new Set(saldos.body.map((s) => s.moneda))].sort();
    expect(monedas).toEqual(['ARS', 'USD']);
  });

  test('un pago en dólares solo cambia el saldo en dólares', async () => {
    const antes = await ana.agent.get(`/api/grupos/${grupoId}/saldos`);
    const ars = antes.body.filter((s) => s.moneda === 'ARS').map((s) => s.saldo);
    const pago = await beto.agent.post(`/api/grupos/${grupoId}/pagos`).send({
      deudorId: beto.id, acreedorId: ana.id, monto: '10.00', moneda: 'USD', fecha: '2026-06-12',
    });
    expect(pago.status).toBe(201);
    const despues = await ana.agent.get(`/api/grupos/${grupoId}/saldos`);
    expect(despues.body.filter((s) => s.moneda === 'ARS').map((s) => s.saldo)).toEqual(ars);
  });

  test('una meta se crea en dólares y lo informa', async () => {
    const res = await ana.agent.post('/api/metas').send({ nombre: 'Viaje', montoObjetivo: '500.00', moneda: 'USD' });
    expect(res.status).toBe(201);
    expect(res.body.moneda).toBe('USD');
  });

  test('una moneda inválida se rechaza en metas y pagos', async () => {
    expect((await ana.agent.post('/api/metas').send({ nombre: 'X', montoObjetivo: '5.00', moneda: 'pesos' })).status).toBe(400);
    const pago = await beto.agent.post(`/api/grupos/${grupoId}/pagos`).send({
      deudorId: beto.id, acreedorId: ana.id, monto: '1.00', moneda: 'dolares', fecha: '2026-06-12',
    });
    expect(pago.status).toBe(400);
  });

  test('editar un movimiento personal permite cambiarle la moneda', async () => {
    const mov = await ana.agent.post('/api/movimientos').send({ tipo: 'gasto', monto: '20.00', fecha: '2026-06-13', descripcion: 'x' });
    const res = await ana.agent.patch(`/api/movimientos/${mov.body.id}`).send({ moneda: 'USD' });
    expect(res.status).toBe(200);
    expect(res.body.moneda).toBe('USD');
  });
});
