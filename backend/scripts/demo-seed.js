// Datos de demostración para presentaciones: una familia con dos tutores y dos menores.
// Solo corre con ENTORNO_DEMO=true y se niega en producción. Usa la API real, como lo haría un usuario.
// Uso: ENTORNO_DEMO=true node scripts/demo-seed.js
require('dotenv').config({ quiet: true });

if (process.env.NODE_ENV === 'production' || process.env.ENTORNO_DEMO !== 'true') {
  console.error('Este script solo corre con ENTORNO_DEMO=true y nunca en producción.');
  process.exit(1);
}

const request = require('supertest');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, MiembroGrupo } = require('../src/db/models');

const CLAVE = 'Demo-Familia-2026';
const DOMINIO = 'demo.platita.test';
const FAMILIA = [
  { clave: 'padre', nombre: 'Carlos Pérez', fechaNacimiento: '1979-05-14', rol: 'tutor' },
  { clave: 'madre', nombre: 'Laura Gómez', fechaNacimiento: '1981-09-02', rol: 'tutora' },
  { clave: 'hijo1', nombre: 'Tomi Pérez', fechaNacimiento: '2013-03-20', rol: 'menor' },
  { clave: 'hijo2', nombre: 'Sofi Pérez', fechaNacimiento: '2016-11-05', rol: 'menor' },
];

const app = createApp();
const correo = (clave) => `${clave}@${DOMINIO}`;

async function main() {
  if (await Usuario.findOne({ where: { email: correo('padre') } })) {
    console.log('Los datos de demostración ya están cargados. No se modifica nada.');
    return;
  }

  // 1) Registro de los cuatro integrantes.
  for (const m of FAMILIA) {
    const res = await request(app).post('/api/auth/registro').send({
      nombre: m.nombre, email: correo(m.clave), password: CLAVE, fechaNacimiento: m.fechaNacimiento,
    });
    if (res.status !== 201) throw new Error(`No se pudo registrar a ${m.clave}: ${res.status}`);
  }
  const id = {};
  for (const m of FAMILIA) id[m.clave] = (await Usuario.findOne({ where: { email: correo(m.clave) } })).id;
  const sesion = async (clave) => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: correo(clave), password: CLAVE });
    return agent;
  };
  const padre = await sesion('padre');
  const madre = await sesion('madre');

  // 2) Grupo familiar creado por el padre. Los demás integrantes se agregan como miembros.
  const grupo = await padre.post('/api/grupos').send({ nombre: 'Familia Pérez (demo)' });
  const grupoId = grupo.body.id;
  for (const clave of ['madre', 'hijo1', 'hijo2']) {
    await MiembroGrupo.create({ grupoId, usuarioId: id[clave], rol: 'miembro' });
  }

  // 3) Tutores vinculados a cada menor, con permisos concretos (los de tarjetas nunca se conceden).
  for (const tutor of [padre, madre]) {
    await tutor.post('/api/control-parental/vinculos').send({ grupoId, email: correo('hijo1') });
    await tutor.post('/api/control-parental/vinculos').send({ grupoId, email: correo('hijo2') });
  }
  await padre.patch(`/api/control-parental/menores/${id.hijo1}/permisos`).send({
    grupoId, permisos: { 'gastos_fijos.crear': true, 'gastos.ver_grupo': true, 'presupuestos.ver': true },
  });
  await madre.patch(`/api/control-parental/menores/${id.hijo2}/permisos`).send({
    grupoId, permisos: { 'gastos.ver_grupo': true, 'estadisticas.ver': true },
  });

  // 4) Categorías base y movimientos de los adultos.
  const categorias = (await padre.get('/api/categorias')).body;
  const cat = (nombre) => categorias.find((c) => c.nombre === nombre)?.id ?? null;
  const movs = [
    { tipo: 'ingreso', monto: '950000.00', fecha: '2026-10-05', descripcion: 'Sueldo Carlos' },
    { tipo: 'ingreso', monto: '820000.00', fecha: '2026-10-05', descripcion: 'Sueldo Laura' },
    { tipo: 'gasto', monto: '185000.00', fecha: '2026-10-08', descripcion: 'Supermercado', categoriaId: cat('Alimentos') },
    { tipo: 'gasto', monto: '42000.00', fecha: '2026-10-12', descripcion: 'Farmacia', categoriaId: cat('Salud') },
    { tipo: 'gasto', monto: '65000.00', fecha: '2026-10-15', descripcion: 'Salida al cine', categoriaId: cat('Entretenimiento') },
    { tipo: 'gasto', monto: '30000.00', fecha: '2026-10-18', descripcion: 'Nafta', categoriaId: cat('Transporte') },
    { tipo: 'gasto', monto: '120.00', fecha: '2026-10-21', descripcion: 'Dólares de viaje', moneda: 'USD' },
  ];
  for (const m of movs) await padre.post('/api/movimientos').send(m);

  // 5) Presupuestos del mes.
  await padre.put('/api/presupuestos').send({ mes: '2026-10', categoriaId: cat('Alimentos'), montoLimite: '200000.00', regla: 'solo_personal' });
  await padre.put('/api/presupuestos').send({ mes: '2026-10', categoriaId: cat('Entretenimiento'), montoLimite: '50000.00', regla: 'solo_personal' });

  // 6) Gasto compartido del grupo: lo paga la madre y se reparte en partes iguales.
  await madre.post(`/api/grupos/${grupoId}/gastos`).send({
    monto: '90000.00', fecha: '2026-10-10', descripcion: 'Cuota del colegio', pagadorId: id.madre,
  });

  // 7) Gastos fijos: simples, con tarjeta de crédito y de débito, y un plan financiado con cuotas vencidas.
  await padre.post('/api/gastos-fijos').send({ nombre: 'Internet', diaVencimiento: 10, conceptos: [{ nombre: 'Plan fibra', montoTotal: '28000.00', recurrente: true, mesInicio: '2026-01' }] });
  await padre.post('/api/gastos-fijos').send({
    nombre: 'Débito automático', diaVencimiento: 15, tipoPago: 'tarjeta_debito', ultimosCuatro: '1234',
    banco: 'Banco Demo', titular: 'Carlos Pérez', alias: 'Débito principal',
    conceptos: [{ nombre: 'Seguro', montoTotal: '15000.00', recurrente: true, mesInicio: '2026-01' }],
  });
  await madre.post('/api/gastos-fijos').send({
    nombre: 'Tarjeta familiar', diaVencimiento: 20, tipoPago: 'tarjeta_credito', ultimosCuatro: '4321',
    banco: 'Banco Demo', titular: 'Laura Gómez', alias: 'Crédito familiar',
    conceptos: [{ nombre: 'Celular en 6 cuotas', montoTotal: '300000.00', cuotas: 6, mesInicio: '2026-06' }],
  });

  console.log('Datos de demostración cargados.');
  console.log('Credenciales (solo para demostración):');
  for (const m of FAMILIA) console.log(`${m.nombre} | ${correo(m.clave)} | ${CLAVE} | ${m.rol}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
