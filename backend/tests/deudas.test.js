const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario } = require('../src/db/models');

const app = createApp();
const sufijo = Date.now();
const clave = 'clave-deudas-prueba-9';
const creados = [];

async function usuario(nombre) {
  const email = `deudas-${nombre}-${sufijo}@example.com`;
  await request(app).post('/api/auth/registro').send({ nombre, email, password: clave, fechaNacimiento: '1985-03-03' });
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

describe('módulo Deudas', () => {
  let ana;
  let otro;

  beforeAll(async () => {
    ana = await usuario('ana');
    otro = await usuario('otro');
    // Plan financiado que empezó en enero de 2026: sus cuotas ya están vencidas.
    await ana.agent.post('/api/gastos-fijos').send({
      nombre: 'Gimnasio', diaVencimiento: 10,
      conceptos: [{ nombre: 'Cuota', montoTotal: '300.00', cuotas: 3, mesInicio: '2026-01' }],
    });
    await ana.agent.post('/api/gastos-fijos').send({
      nombre: 'Servicio en dólares', diaVencimiento: 5, moneda: 'USD',
      conceptos: [{ nombre: 'Licencia', montoTotal: '50.00', cuotas: 2, mesInicio: '2026-01' }],
    });
  });

  test('las cuotas vencidas de un plan financiado aparecen como deuda', async () => {
    const res = await ana.agent.get('/api/deudas');
    expect(res.status).toBe(200);
    const pesos = res.body.deudas.filter((d) => d.moneda === 'ARS');
    expect(pesos).toHaveLength(3);
    expect(pesos.every((d) => d.vencida)).toBe(true);
  });

  test('los totales se muestran separados por moneda, sin convertir', async () => {
    const res = await ana.agent.get('/api/deudas');
    const ars = res.body.totales.find((t) => t.moneda === 'ARS');
    const usd = res.body.totales.find((t) => t.moneda === 'USD');
    expect(ars).toEqual({ moneda: 'ARS', pendiente: '300.00', vencido: '300.00' });
    expect(usd).toEqual({ moneda: 'USD', pendiente: '50.00', vencido: '50.00' });
  });

  test('pagar una cuota la saca de la deuda', async () => {
    const res = await ana.agent.get('/api/deudas');
    const cuota = res.body.deudas.find((d) => d.moneda === 'ARS');
    const gasto = await ana.agent.get(`/api/gastos-fijos/${cuota.gastoId}`);
    const cuotaId = gasto.body.cuotas.find((c) => c.id === cuota.id).id;
    const pago = await ana.agent.post(`/api/gastos-fijos/${cuota.gastoId}/cuotas/${cuotaId}/pagar`).send({});
    expect(pago.status).toBe(200);
    const despues = await ana.agent.get('/api/deudas');
    expect(despues.body.totales.find((t) => t.moneda === 'ARS').pendiente).toBe('200.00');
  });

  test('otro usuario no ve las deudas de Ana', async () => {
    const res = await otro.agent.get('/api/deudas');
    expect(res.status).toBe(200);
    expect(res.body.deudas).toHaveLength(0);
    expect(res.body.totales).toEqual([]);
  });

  // Solo quien creó el gasto fijo puede pagar sus cuotas: la pantalla de Deudas muestra el botón
  // Pagar únicamente donde va a funcionar.
  test('cada deuda indica si el usuario puede pagarla', async () => {
    const propias = (await ana.agent.get('/api/deudas')).body.deudas;
    expect(propias.length).toBeGreaterThan(0);
    expect(propias.every((d) => d.puedePagar === true)).toBe(true);

    const grupo = (await ana.agent.post('/api/grupos').send({ nombre: `Deudas ${sufijo}` })).body;
    expect((await otro.agent.post('/api/grupos/unirse').send({ codigo: grupo.codigo })).status).toBeLessThan(300);
    const gasto = await ana.agent.post('/api/gastos-fijos').send({
      nombre: 'Expensas del grupo', diaVencimiento: 10, ambito: 'grupo', grupoId: grupo.id,
      conceptos: [{ nombre: 'Expensas', montoTotal: '90.00', cuotas: 1, mesInicio: '2026-01' }],
    });
    expect(gasto.status).toBe(201);

    const deOtro = (await otro.agent.get('/api/deudas')).body.deudas.filter((d) => d.gastoId === gasto.body.id);
    expect(deOtro).toHaveLength(1);
    expect(deOtro[0].puedePagar).toBe(false);
    // Cada cuota dice de qué concepto es: un gasto fijo puede tener varios.
    expect(deOtro[0].concepto).toBe('Expensas');
    const deAna = (await ana.agent.get('/api/deudas')).body.deudas.filter((d) => d.gastoId === gasto.body.id);
    expect(deAna[0].puedePagar).toBe(true);
  });
});
