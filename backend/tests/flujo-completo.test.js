const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const {
  Usuario, Grupo, MiembroGrupo, Movimiento, ParticipacionGasto, PagoEntreMiembros, Notificacion,
} = require('../src/db/models');
const Invitacion = require('../src/db/models/invitacion');
const email = require('../src/services/email');

const app = createApp();
const sufijo = Date.now();
const correos = ['a', 'b', 'c'].map((x) => `flujo-${x}-${sufijo}@example.com`);
const password = 'clave-segura-1';
let espia;
let grupoId;

function tokenEnviado() {
  const texto = espia.mock.calls[espia.mock.calls.length - 1][0].texto;
  return /token=([0-9a-f]+)/.exec(texto)[1];
}

const centavos = (s) => Math.round(Number(s) * 100);
const saldoDe = (body, uid) => body.find((x) => x.usuarioId === uid).saldo;

beforeAll(() => {
  espia = jest.spyOn(email, 'enviarEmail').mockResolvedValue();
});

afterAll(async () => {
  espia.mockRestore();
  const usuarios = await Usuario.findAll({ where: { email: correos } });
  const ids = usuarios.map((u) => u.id);
  if (grupoId) {
    const movs = await Movimiento.findAll({ where: { grupoId } });
    await ParticipacionGasto.destroy({ where: { movimientoId: movs.map((m) => m.id) } });
    await Movimiento.destroy({ where: { grupoId } });
    await PagoEntreMiembros.destroy({ where: { grupoId } });
    await Invitacion.destroy({ where: { grupoId } });
    await MiembroGrupo.destroy({ where: { grupoId } });
    await Grupo.destroy({ where: { id: grupoId } });
  }
  await Notificacion.destroy({ where: { usuarioId: ids } });
  await Usuario.destroy({ where: { email: correos } });
  await sequelize.close();
});

test('registro, grupo, invitaciones, gasto de 100.00 entre 3, saldos en cero y pagos que liquidan', async () => {
  const agentes = correos.map(() => request.agent(app));
  const nombres = ['Ana', 'Bruno', 'Carla'];
  for (let i = 0; i < 3; i++) {
    const reg = await agentes[i].post('/api/auth/registro').send({ nombre: nombres[i], email: correos[i], password });
    expect(reg.status).toBe(201);
    expect((await agentes[i].post('/api/auth/login').send({ email: correos[i], password })).status).toBe(200);
  }
  const us = await Usuario.findAll({ where: { email: correos } });
  const [idA, idB, idC] = correos.map((c) => us.find((u) => u.email === c).id);

  // Crear grupo e invitar/aceptar a B y C
  const grupo = await agentes[0].post('/api/grupos').send({ nombre: 'Flujo' });
  expect(grupo.status).toBe(201);
  grupoId = grupo.body.id;
  for (const i of [1, 2]) {
    const inv = await agentes[0].post(`/api/grupos/${grupoId}/invitaciones`).send({ email: correos[i] });
    expect(inv.status).toBe(201);
    const acepta = await agentes[i].post('/api/invitaciones/aceptar').send({ token: tokenEnviado() });
    expect(acepta.status).toBe(200);
  }
  expect(await MiembroGrupo.count({ where: { grupoId } })).toBe(3);

  // Gasto compartido de 100.00 pagado por A entre los 3
  const gasto = await agentes[0].post(`/api/grupos/${grupoId}/gastos`).send({
    pagadorId: idA, monto: '100.00', fecha: '2026-10-10', descripcion: 'Cena',
  });
  expect(gasto.status).toBe(201);
  expect(gasto.body.participaciones).toHaveLength(3);
  expect(gasto.body.participaciones.reduce((s, p) => s + centavos(p.monto), 0)).toBe(10000);

  // Los saldos suman exactamente 0.00; A es acreedor, B y C deudores
  const saldos1 = await agentes[1].get(`/api/grupos/${grupoId}/saldos`);
  expect(saldos1.status).toBe(200);
  expect(saldos1.body).toHaveLength(3);
  expect(saldos1.body.reduce((s, x) => s + centavos(x.saldo), 0)).toBe(0);
  expect(centavos(saldoDe(saldos1.body, idA))).toBeGreaterThan(0);
  expect(centavos(saldoDe(saldos1.body, idB))).toBeLessThan(0);

  // B salda su deuda con A
  const pago = await agentes[1].post(`/api/grupos/${grupoId}/pagos`).send({
    deudorId: idB, acreedorId: idA, monto: saldoDe(saldos1.body, idB).replace('-', ''), fecha: '2026-10-11',
  });
  expect(pago.status).toBe(201);
  const saldos2 = await agentes[0].get(`/api/grupos/${grupoId}/saldos`);
  expect(saldoDe(saldos2.body, idB)).toBe('0.00');
  expect(saldos2.body.reduce((s, x) => s + centavos(x.saldo), 0)).toBe(0);

  // C salda la suya y todos vuelven a 0.00
  const pagoC = await agentes[2].post(`/api/grupos/${grupoId}/pagos`).send({
    deudorId: idC, acreedorId: idA, monto: saldoDe(saldos2.body, idC).replace('-', ''), fecha: '2026-10-12',
  });
  expect(pagoC.status).toBe(201);
  const saldos3 = await agentes[0].get(`/api/grupos/${grupoId}/saldos`);
  saldos3.body.forEach((s) => expect(s.saldo).toBe('0.00'));
});
