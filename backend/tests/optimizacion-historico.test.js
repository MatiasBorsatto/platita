const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario } = require('../src/db/models');

// Optimización A-01: la serie histórica por rango debe dar exactamente lo mismo que pedir cada mes.
const app = createApp();
const email = `opt-historico-${Date.now()}@example.com`;
const clave = 'clave-optimizacion-9';
let agent;
let usuarioId;

beforeAll(async () => {
  await request(app).post('/api/auth/registro').send({ nombre: 'Opt', email, password: clave, fechaNacimiento: '1990-01-01' });
  usuarioId = (await Usuario.findOne({ where: { email } })).id;
  agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: clave });
  const movs = [
    { tipo: 'ingreso', monto: '1000.00', fecha: '2026-01-10', descripcion: 'sueldo' },
    { tipo: 'gasto', monto: '250.50', fecha: '2026-01-20', descripcion: 'super' },
    { tipo: 'gasto', monto: '80.00', fecha: '2026-03-02', descripcion: 'cine' },
    { tipo: 'ingreso', monto: '900.00', fecha: '2026-03-15', descripcion: 'extra' },
  ];
  for (const m of movs) await agent.post('/api/movimientos').send(m);
  const meta = await agent.post('/api/metas').send({ nombre: 'Viaje', montoObjetivo: '5000.00' });
  await agent.post(`/api/metas/${meta.body.id}/aportes`).send({ monto: '300.00', fecha: '2026-02-05' });
});

afterAll(async () => {
  await Usuario.destroy({ where: { id: usuarioId } });
  await sequelize.close();
});

test('la serie histórica coincide mes a mes con el resumen mensual', async () => {
  const serie = await agent.get('/api/estadisticas/historico?desde=2026-01&hasta=2026-03');
  expect(serie.status).toBe(200);
  for (const fila of serie.body) {
    const mensual = await agent.get(`/api/estadisticas/mensual?mes=${fila.mes}`);
    expect(fila.ingresos).toBe(mensual.body.ingresos);
    expect(fila.gastos).toBe(mensual.body.gastos);
    expect(fila.ahorroNeto).toBe(mensual.body.ahorroNeto);
    expect(fila.aportesMetas).toBe(mensual.body.aportesMetas);
  }
});

test('un mes sin movimientos aparece en la serie con ceros', async () => {
  const serie = await agent.get('/api/estadisticas/historico?desde=2026-02&hasta=2026-02');
  expect(serie.body).toHaveLength(1);
  expect(serie.body[0].ingresos).toBe('0.00');
  expect(serie.body[0].gastos).toBe('0.00');
});
