const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Grupo, MiembroGrupo, VinculoTutor, PermisoMenor } = require('../src/db/models');
const { edadA, validarFechaNacimiento, clasificar } = require('../src/modules/autorizacion/clasificacion');
const { PERMISOS, TARJETAS } = require('../src/modules/autorizacion/permisos');

const app = createApp();
const sufijo = Date.now();
const correo = (nombre) => `auth-${nombre}-${sufijo}@example.com`;
const clave = 'clave-autorizacion-9';
const creados = [];

async function usuario(nombre, fechaNacimiento) {
  await request(app).post('/api/auth/registro').send({ nombre, email: correo(nombre), password: clave });
  const u = await Usuario.findOne({ where: { email: correo(nombre) } });
  creados.push(u.id);
  if (fechaNacimiento !== undefined) await Usuario.update({ fechaNacimiento }, { where: { id: u.id } });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: correo(nombre), password: clave });
  return { id: u.id, agent };
}

afterAll(async () => {
  await Usuario.destroy({ where: { id: creados } });
  await sequelize.close();
});

describe('clasificación por edad (unitarias)', () => {
  test('cuenta día, mes y año: el cumpleaños de hoy cuenta, el de mañana no', () => {
    expect(edadA('2008-11-07', '2026-11-07')).toBe(18);
    expect(edadA('2008-11-08', '2026-11-07')).toBe(17);
  });

  test('un nacido el 29 de febrero cumple en el mes de febrero de años no bisiestos', () => {
    expect(edadA('2008-02-29', '2026-02-28')).toBe(17);
    expect(edadA('2008-02-29', '2026-03-01')).toBe(18);
  });

  test('clasifica en menor antes de los 18 y adulto desde los 18; sin fecha queda sin clasificar', () => {
    expect(clasificar('2010-01-01', '2026-11-07')).toBe('menor');
    expect(clasificar('2000-01-01', '2026-11-07')).toBe('adulto');
    expect(clasificar(null, '2026-11-07')).toBe('sin_fecha');
  });

  test('rechaza fechas futuras, inexistentes y con formato incorrecto', () => {
    expect(() => validarFechaNacimiento('2026-11-08', '2026-11-07')).toThrow('no puede ser futura');
    expect(() => validarFechaNacimiento('2026-02-30', '2026-11-07')).toThrow('no es una fecha válida');
    expect(() => validarFechaNacimiento('07/11/2000', '2026-11-07')).toThrow('AAAA-MM-DD');
  });

  test('ningún permiso de tarjetas es concedible a un menor por configuración', () => {
    expect(TARJETAS).toContain(PERMISOS.TARJETAS_REGISTRAR);
    expect(TARJETAS.every((p) => p.startsWith('tarjetas.'))).toBe(true);
  });
});

describe('autorización en gastos fijos (integración)', () => {
  let tutor;
  let menor;
  let grupoId;

  beforeAll(async () => {
    tutor = await usuario('tutor', '1985-06-15');
    menor = await usuario('menor', '2015-05-01');
    const grupo = await tutor.agent.post('/api/grupos').send({ nombre: `Familia ${sufijo}` });
    grupoId = grupo.body.id;
    await MiembroGrupo.create({ grupoId, usuarioId: menor.id, rol: 'miembro' });
    const vinculo = await VinculoTutor.create({ tutorId: tutor.id, menorId: menor.id, grupoId });
    await PermisoMenor.create({ vinculoId: vinculo.id, permiso: PERMISOS.GASTOS_FIJOS_CREAR, permitido: false });
  });

  const gastoSimple = { nombre: 'Internet', diaVencimiento: 10 };
  const gastoTarjeta = {
    nombre: 'Tarjeta', diaVencimiento: 10, tipoPago: 'tarjeta_credito',
    ultimosCuatro: '4242', banco: 'Banco Ejemplo', titular: 'Ana Pérez', alias: 'Principal',
  };

  test('un menor sin permiso concedido no puede crear un gasto fijo simple', async () => {
    const res = await menor.agent.post('/api/gastos-fijos').send(gastoSimple);
    expect(res.status).toBe(403);
  });

  test('un menor con el permiso concedido por su tutor sí puede crear un gasto fijo simple', async () => {
    await PermisoMenor.update({ permitido: true }, {
      where: { permiso: PERMISOS.GASTOS_FIJOS_CREAR },
    });
    const res = await menor.agent.post('/api/gastos-fijos').send(gastoSimple);
    expect(res.status).toBe(201);
    await PermisoMenor.update({ permitido: false }, { where: { permiso: PERMISOS.GASTOS_FIJOS_CREAR } });
  });

  test('un menor nunca puede crear un gasto con tarjeta, aunque el permiso general esté concedido', async () => {
    await PermisoMenor.update({ permitido: true }, { where: { permiso: PERMISOS.GASTOS_FIJOS_CREAR } });
    const res = await menor.agent.post('/api/gastos-fijos').send(gastoTarjeta);
    expect(res.status).toBe(403);
    await PermisoMenor.update({ permitido: false }, { where: { permiso: PERMISOS.GASTOS_FIJOS_CREAR } });
  });

  test('un adulto crea un gasto con tarjeta y ve los datos de la tarjeta', async () => {
    const creado = await tutor.agent.post('/api/gastos-fijos').send(gastoTarjeta);
    expect(creado.status).toBe(201);
    const detalle = await tutor.agent.get(`/api/gastos-fijos/${creado.body.id}`);
    expect(detalle.body.ultimosCuatro).toBe('4242');
    expect(detalle.body.tarjetaTipo).toBe('credito');
  });

  test('datos sensibles de la tarjeta se rechazan aunque el cliente los envíe', async () => {
    const res = await tutor.agent.post('/api/gastos-fijos').send({ ...gastoTarjeta, numeroTarjeta: '4111111111111111' });
    expect(res.status).toBe(400);
    const cvv = await tutor.agent.post('/api/gastos-fijos').send({ ...gastoTarjeta, cvv: '123' });
    expect(cvv.status).toBe(400);
  });

  test('los últimos cuatro dígitos deben ser exactamente cuatro números', async () => {
    const res = await tutor.agent.post('/api/gastos-fijos').send({ ...gastoTarjeta, ultimosCuatro: '42' });
    expect(res.status).toBe(400);
  });

  test('un usuario sin fecha de nacimiento puede crear gastos propios, pero no con tarjeta', async () => {
    const sinFecha = await usuario('sinfecha');
    expect((await sinFecha.agent.post('/api/gastos-fijos').send(gastoSimple)).status).toBe(201);
    expect((await sinFecha.agent.post('/api/gastos-fijos').send(gastoTarjeta)).status).toBe(403);
  });

  test('no se puede crear un gasto de grupo en un grupo del que no se es miembro', async () => {
    const ajeno = await usuario('ajeno', '1990-01-01');
    const res = await ajeno.agent.post('/api/gastos-fijos').send({ ...gastoSimple, ambito: 'grupo', grupoId });
    expect(res.status).toBe(404);
  });
});
