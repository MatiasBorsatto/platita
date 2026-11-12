const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, MiembroGrupo, VinculoTutor } = require('../src/db/models');

const app = createApp();
const sufijo = Date.now();
const clave = 'clave-parental-prueba-9';
const creados = [];

async function usuario(nombre, fechaNacimiento) {
  const email = `parental-${nombre}-${sufijo}@example.com`;
  await request(app).post('/api/auth/registro').send({ nombre, email, password: clave, fechaNacimiento });
  const u = await Usuario.findOne({ where: { email } });
  creados.push(u.id);
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: clave });
  return { id: u.id, email, agent };
}

afterAll(async () => {
  await Usuario.destroy({ where: { id: creados } });
  await sequelize.close();
});

describe('control parental', () => {
  let tutor;
  let menor;
  let externo;
  let grupoId;

  beforeAll(async () => {
    tutor = await usuario('tutor', '1980-04-04');
    menor = await usuario('hijo', '2014-06-01');
    externo = await usuario('externo', '1975-01-01');
    const grupo = await tutor.agent.post('/api/grupos').send({ nombre: `Parental ${sufijo}` });
    grupoId = grupo.body.id;
    await MiembroGrupo.create({ grupoId, usuarioId: menor.id, rol: 'miembro' });
  });

  test('un adulto vincula a un menor del grupo y la vinculación queda una sola vez', async () => {
    const primera = await tutor.agent.post('/api/control-parental/vinculos').send({ grupoId, email: menor.email });
    expect(primera.status).toBe(201);
    const segunda = await tutor.agent.post('/api/control-parental/vinculos').send({ grupoId, email: menor.email });
    expect(segunda.status).toBe(200);
    expect(await VinculoTutor.count({ where: { tutorId: tutor.id, menorId: menor.id } })).toBe(1);
  });

  test('el tutor ve al menor con todos los permisos apagados y las tarjetas bloqueadas', async () => {
    const res = await tutor.agent.get('/api/control-parental/menores');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const { permisos } = res.body[0];
    expect(permisos.every((p) => p.permitido === false)).toBe(true);
    expect(permisos.filter((p) => p.permiso.startsWith('tarjetas.')).every((p) => p.bloqueadoPorPolitica)).toBe(true);
  });

  test('conceder un permiso se aplica al instante y deja registro en la auditoría', async () => {
    const res = await tutor.agent
      .patch(`/api/control-parental/menores/${menor.id}/permisos`)
      .send({ grupoId, permisos: { 'gastos_fijos.crear': true } });
    expect(res.status).toBe(200);
    expect(res.body.permisos.find((p) => p.permiso === 'gastos_fijos.crear').permitido).toBe(true);

    const gasto = await menor.agent.post('/api/gastos-fijos').send({ nombre: 'Internet', diaVencimiento: 10 });
    expect(gasto.status).toBe(201);

    const actividad = await tutor.agent.get(`/api/control-parental/menores/${menor.id}/actividad`);
    expect(actividad.body.some((a) => a.accion === 'permiso.concedido' && a.detalle.permiso === 'gastos_fijos.crear')).toBe(true);
  });

  test('ningún permiso de tarjetas se puede conceder a un menor', async () => {
    const res = await tutor.agent
      .patch(`/api/control-parental/menores/${menor.id}/permisos`)
      .send({ grupoId, permisos: { 'tarjetas.registrar': true } });
    expect(res.status).toBe(400);
  });

  test('un permiso desconocido se rechaza', async () => {
    const res = await tutor.agent
      .patch(`/api/control-parental/menores/${menor.id}/permisos`)
      .send({ grupoId, permisos: { 'superpoder.total': true } });
    expect(res.status).toBe(400);
  });

  test('el menor no puede ver ni cambiar sus propios permisos ni vincular a nadie', async () => {
    expect((await menor.agent.get('/api/control-parental/menores')).status).toBe(403);
    expect((await menor.agent
      .patch(`/api/control-parental/menores/${menor.id}/permisos`)
      .send({ grupoId, permisos: { 'gastos.crear_grupo': true } })).status).toBe(403);
    expect((await menor.agent.post('/api/control-parental/vinculos').send({ grupoId, email: tutor.email })).status).toBe(403);
  });

  test('no se puede vincular a un menor desde un grupo al que el tutor no pertenece', async () => {
    const res = await externo.agent.post('/api/control-parental/vinculos').send({ grupoId, email: menor.email });
    expect(res.status).toBe(404);
  });

  test('no se puede vincular como menor a un adulto', async () => {
    const res = await tutor.agent.post('/api/control-parental/vinculos').send({ grupoId, email: externo.email });
    expect(res.status).toBe(400);
  });

  test('desvincular quita los permisos familiares; sin tutor, el menor conserva solo lo personal', async () => {
    const res = await tutor.agent.delete(`/api/control-parental/menores/${menor.id}?grupoId=${grupoId}`);
    expect(res.status).toBe(200);
    const gastoGrupo = await menor.agent.get(`/api/grupos/${grupoId}/gastos`);
    expect(gastoGrupo.status).toBe(403);
    const personal = await menor.agent.post('/api/gastos-fijos').send({ nombre: 'Luz', diaVencimiento: 5 });
    expect(personal.status).toBe(201);
  });

  test('con tutor vinculado, el menor solo usa lo que el tutor concedió', async () => {
    await tutor.agent.post('/api/control-parental/vinculos').send({ grupoId, email: menor.email });
    expect((await menor.agent.get('/api/movimientos')).status).toBe(403);
    expect((await menor.agent.get('/api/estadisticas/mensual?mes=2026-11')).status).toBe(403);
    expect((await menor.agent.get(`/api/grupos/${grupoId}/gastos`)).status).toBe(403);
    const concedido = await tutor.agent
      .patch(`/api/control-parental/menores/${menor.id}/permisos`)
      .send({ grupoId, permisos: { 'movimientos.ver': true, 'gastos.ver_grupo': true } });
    expect(concedido.status).toBe(200);
    expect((await menor.agent.get('/api/movimientos')).status).toBe(200);
    expect((await menor.agent.get(`/api/grupos/${grupoId}/gastos`)).status).toBe(200);
  });

  test('el código del grupo no llega a quien no es administrador', async () => {
    const lista = await menor.agent.get('/api/grupos');
    const grupo = lista.body.find((g) => g.id === grupoId);
    expect(grupo).toBeDefined();
    expect(grupo.codigo).toBeUndefined();
  });

  // M-08: el control parental existe solo dentro del grupo. Al salir, el vínculo se elimina y queda registrado.
  test('si el menor sale del grupo, el vínculo se elimina y vuelve a sus funciones personales', async () => {
    expect(await VinculoTutor.count({ where: { menorId: menor.id, grupoId } })).toBe(1);
    expect((await menor.agent.post(`/api/grupos/${grupoId}/salir`)).status).toBe(204);
    expect(await VinculoTutor.count({ where: { menorId: menor.id, grupoId } })).toBe(0);
    expect((await menor.agent.get('/api/movimientos')).status).toBe(200);
    const actividad = await tutor.agent.get(`/api/control-parental/menores/${menor.id}/actividad`);
    expect(actividad.status).toBe(200);
    expect(actividad.body.some((a) => a.accion === 'vinculo.eliminado' && a.detalle?.motivo === 'salida_del_grupo')).toBe(true);
  });

  test('un vínculo de un grupo del que el menor ya no es miembro no da permisos', async () => {
    // Vínculo huérfano creado a mano (como los que quedaban antes de la corrección).
    const vinculo = await VinculoTutor.create({ tutorId: tutor.id, menorId: menor.id, grupoId });
    expect((await menor.agent.get('/api/movimientos')).status).toBe(200);
    expect((await menor.agent.get(`/api/grupos/${grupoId}/gastos`)).status).toBe(404);
    await vinculo.destroy();
  });
});
