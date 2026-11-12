// Datos de demostración para presentaciones: la familia Pérez usando Platita durante los últimos seis meses.
// Dos adultos (tutores) y dos menores, con movimientos, presupuestos, gastos fijos con tarjeta, metas en pesos y
// dólares, gastos compartidos, pagos entre miembros y control parental.
// Solo corre con ENTORNO_DEMO=true y se niega en producción. Usa la API real, como lo haría un usuario.
// Uso:
//   ENTORNO_DEMO=true node scripts/demo-seed.js              carga los datos si no existen
//   ENTORNO_DEMO=true node scripts/demo-seed.js --reiniciar  borra las cuentas de demostración y las vuelve a crear
require('dotenv').config({ quiet: true });

if (process.env.NODE_ENV === 'production' || process.env.ENTORNO_DEMO !== 'true') {
  console.error('Este script solo corre con ENTORNO_DEMO=true y nunca en producción.');
  process.exit(1);
}

const request = require('supertest');
const { Op } = require('sequelize');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/db/sequelize');
const { Usuario, Grupo } = require('../src/db/models');

// La contraseña no se versiona (M-10): se lee de DEMO_CLAVE en backend/.env.
const CLAVE = process.env.DEMO_CLAVE;
if (!CLAVE || CLAVE.length < 8) {
  console.error('Definí DEMO_CLAVE (al menos 8 caracteres) en backend/.env antes de cargar los datos de demostración.');
  process.exit(1);
}
const DOMINIO = 'demo.platita.test';
const FAMILIA = [
  { clave: 'padre', nombre: 'Carlos Pérez', fechaNacimiento: '1979-05-14', rol: 'adulto, administra el grupo y es tutor' },
  { clave: 'madre', nombre: 'Laura Gómez', fechaNacimiento: '1981-09-02', rol: 'adulta y tutora' },
  { clave: 'hijo1', nombre: 'Tomi Pérez', fechaNacimiento: '2013-03-20', rol: 'menor (13): sin estadísticas ni presupuestos' },
  { clave: 'hijo2', nombre: 'Sofi Pérez', fechaNacimiento: '2016-11-05', rol: 'menor (10): solo sus movimientos' },
];

const app = createApp();
const correo = (clave) => `${clave}@${DOMINIO}`;
const reiniciar = process.argv.includes('--reiniciar');

// Fechas relativas a hoy (hora de Buenos Aires): los seis meses que terminan en el actual.
const HOY = new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).slice(0, 10);
const [anioHoy, mesHoy, diaHoy] = HOY.split('-').map(Number);
const MESES = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(Date.UTC(anioHoy, mesHoy - 1 - (5 - i), 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
});
const MES_ACTUAL = MESES[5];
const fecha = (mes, dia) => `${mes}-${String(dia).padStart(2, '0')}`;
// En el mes actual, nada puede quedar en el futuro.
const diaValido = (mes, dia) => (mes === MES_ACTUAL ? Math.min(dia, Math.max(1, diaHoy - 1)) : dia);

// Montos variados pero repetibles: siempre generan los mismos datos.
let semilla = 20261112;
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648);
const entre = (min, max) => (Math.round((min + azar() * (max - min)) / 100) * 100).toFixed(2);
const unoDe = (lista) => lista[Math.floor(azar() * lista.length)];

async function exigir(promesa, esperado, que) {
  const res = await promesa;
  const ok = Array.isArray(esperado) ? esperado.includes(res.status) : res.status === esperado;
  if (!ok) throw new Error(`${que}: respondió ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

async function borrarDemo() {
  const usuarios = await Usuario.findAll({ where: { email: { [Op.like]: `%@${DOMINIO}` } }, attributes: ['id'] });
  const ids = usuarios.map((u) => u.id);
  if (!ids.length) return;
  await Grupo.destroy({ where: { creadoPor: ids } });
  await Usuario.destroy({ where: { id: ids } });
  console.log(`Se borraron ${ids.length} cuentas de demostración anteriores.`);
}

async function main() {
  if (reiniciar) await borrarDemo();
  if (await Usuario.findOne({ where: { email: correo('padre') } })) {
    console.log('Los datos de demostración ya están cargados. Para volver a crearlos: --reiniciar');
    return;
  }

  // 1) Registro e inicio de sesión de los cuatro integrantes.
  const id = {};
  const api = {};
  for (const m of FAMILIA) {
    await exigir(request(app).post('/api/auth/registro').send({
      nombre: m.nombre, email: correo(m.clave), password: CLAVE, fechaNacimiento: m.fechaNacimiento,
    }), 201, `registro de ${m.clave}`);
    id[m.clave] = (await Usuario.findOne({ where: { email: correo(m.clave) } })).id;
    api[m.clave] = request.agent(app);
    await exigir(api[m.clave].post('/api/auth/login').send({ email: correo(m.clave), password: CLAVE }), 200, `login de ${m.clave}`);
  }
  const { padre, madre, hijo1, hijo2 } = api;

  // 2) Categorías: las base y algunas propias.
  const base = await exigir(padre.get('/api/categorias'), 200, 'categorías');
  const cat = (nombre) => base.find((c) => c.nombre === nombre)?.id ?? null;
  const mascotas = (await exigir(padre.post('/api/categorias').send({ nombre: 'Mascotas' }), 201, 'categoría Mascotas')).id;
  const cuidado = (await exigir(madre.post('/api/categorias').send({ nombre: 'Cuidado personal' }), 201, 'categoría Cuidado personal')).id;

  // 3) Grupo familiar: lo crea el padre y los demás se suman con el código, como en la app.
  const grupo = await exigir(padre.post('/api/grupos').send({ nombre: 'Familia Pérez' }), 201, 'grupo');
  const grupoId = grupo.id;
  for (const quien of [madre, hijo1, hijo2]) await exigir(quien.post('/api/grupos/unirse').send({ codigo: grupo.codigo }), [200, 201], 'unirse al grupo');

  // 4) Control parental. Los dos adultos son tutores de los dos menores.
  for (const tutor of [padre, madre]) {
    for (const menor of ['hijo1', 'hijo2']) {
      await exigir(tutor.post('/api/control-parental/vinculos').send({ grupoId, email: correo(menor) }), [200, 201], 'vínculo');
    }
  }
  // Tomi maneja su plata y ve los gastos del grupo, pero no estadísticas ni presupuestos (para mostrar el 403).
  await exigir(padre.patch(`/api/control-parental/menores/${id.hijo1}/permisos`).send({ grupoId, permisos: {
    'movimientos.ver': true, 'gastos.ver_simples': true, 'gastos.crear_simples': true, 'gastos.editar_simples': true,
    'gastos.consultar_propios': true, 'gastos.ver_grupo': true,
  } }), 200, 'permisos de Tomi');
  // Sofi solo anota su mesada y sus gastos.
  await exigir(madre.patch(`/api/control-parental/menores/${id.hijo2}/permisos`).send({ grupoId, permisos: {
    'movimientos.ver': true, 'gastos.ver_simples': true, 'gastos.crear_simples': true,
  } }), 200, 'permisos de Sofi');

  // 5) Presupuestos del mes actual (antes de los gastos del mes, para que salten los avisos).
  for (const [categoria, limite] of [['Alimentos', '400000.00'], ['Entretenimiento', '60000.00'], ['Transporte', '150000.00']]) {
    await exigir(padre.put('/api/presupuestos').send({ mes: MES_ACTUAL, categoriaId: cat(categoria), montoLimite: limite, regla: 'solo_personal' }), [200, 201], `presupuesto ${categoria}`);
  }
  await exigir(madre.put('/api/presupuestos').send({ mes: MES_ACTUAL, categoriaId: cuidado, montoLimite: '50000.00', regla: 'solo_personal' }), [200, 201], 'presupuesto Cuidado personal');

  // 6) Movimientos de seis meses.
  const mov = (quien, datos) => exigir(quien.post('/api/movimientos').send(datos), 201, `movimiento ${datos.descripcion}`);
  for (const mes of MESES) {
    const actual = mes === MES_ACTUAL;
    // Carlos
    if (!actual || diaHoy > 5) await mov(padre, { tipo: 'ingreso', monto: '1650000.00', fecha: fecha(mes, 5), descripcion: 'Sueldo' });
    await mov(padre, { tipo: 'ingreso', monto: unoDe(['200.00', '250.00', '300.00']), moneda: 'USD', fecha: fecha(mes, diaValido(mes, 6)), descripcion: 'Compra de dólares' });
    if (actual) {
      // Mes actual con montos fijos: Alimentos al 82 %, Entretenimiento pasado del tope y Transporte a la mitad.
      for (const [d, m, desc] of [[2, '118500.00', 'Supermercado'], [4, '36200.00', 'Verdulería'], [6, '96300.00', 'Supermercado'], [8, '42000.00', 'Carnicería'], [9, '35000.00', 'Panadería y almacén']]) {
        await mov(padre, { tipo: 'gasto', monto: m, fecha: fecha(mes, diaValido(mes, d)), descripcion: desc, categoriaId: cat('Alimentos') });
      }
      await mov(padre, { tipo: 'gasto', monto: '48000.00', fecha: fecha(mes, diaValido(mes, 3)), descripcion: 'Cena de aniversario', categoriaId: cat('Entretenimiento') });
      await mov(padre, { tipo: 'gasto', monto: '24000.00', fecha: fecha(mes, diaValido(mes, 9)), descripcion: 'Entradas de cine', categoriaId: cat('Entretenimiento') });
      await mov(padre, { tipo: 'gasto', monto: '45000.00', fecha: fecha(mes, diaValido(mes, 4)), descripcion: 'Nafta', categoriaId: cat('Transporte') });
      await mov(padre, { tipo: 'gasto', monto: '28500.00', fecha: fecha(mes, diaValido(mes, 10)), descripcion: 'Nafta', categoriaId: cat('Transporte') });
      await mov(padre, { tipo: 'gasto', monto: '18700.00', fecha: fecha(mes, diaValido(mes, 7)), descripcion: 'Veterinaria de Toby', categoriaId: mascotas });
    } else {
      for (const d of [3, 12, 24]) await mov(padre, { tipo: 'gasto', monto: entre(85000, 140000), fecha: fecha(mes, d), descripcion: 'Supermercado', categoriaId: cat('Alimentos') });
      await mov(padre, { tipo: 'gasto', monto: entre(30000, 45000), fecha: fecha(mes, 16), descripcion: 'Verdulería y carnicería', categoriaId: cat('Alimentos') });
      for (const d of [6, 21]) await mov(padre, { tipo: 'gasto', monto: entre(35000, 48000), fecha: fecha(mes, d), descripcion: 'Nafta', categoriaId: cat('Transporte') });
      await mov(padre, { tipo: 'gasto', monto: entre(32000, 52000), fecha: fecha(mes, 14), descripcion: 'Luz', categoriaId: cat('Servicios') });
      await mov(padre, { tipo: 'gasto', monto: entre(18000, 34000), fecha: fecha(mes, 17), descripcion: 'Gas', categoriaId: cat('Servicios') });
      await mov(padre, { tipo: 'gasto', monto: entre(25000, 70000), fecha: fecha(mes, 19), descripcion: unoDe(['Salida a comer', 'Cine en familia']), categoriaId: cat('Entretenimiento') });
      await mov(padre, { tipo: 'gasto', monto: entre(9000, 26000), fecha: fecha(mes, 26), descripcion: 'Alimento para Toby', categoriaId: mascotas });
      if (azar() > 0.5) await mov(padre, { tipo: 'gasto', monto: entre(15000, 42000), fecha: fecha(mes, 11), descripcion: 'Farmacia', categoriaId: cat('Salud') });
      await mov(padre, { tipo: 'gasto', monto: entre(60000, 95000), fecha: fecha(mes, 15), descripcion: 'Monotributo', categoriaId: cat('Impuestos') });
    }
    // Laura
    if (!actual || diaHoy > 7) await mov(madre, { tipo: 'ingreso', monto: '980000.00', fecha: fecha(mes, 7), descripcion: 'Sueldo' });
    if (actual) {
      await mov(madre, { tipo: 'gasto', monto: '32000.00', fecha: fecha(mes, diaValido(mes, 4)), descripcion: 'Peluquería', categoriaId: cuidado });
      await mov(madre, { tipo: 'gasto', monto: '9800.00', fecha: fecha(mes, diaValido(mes, 8)), descripcion: 'Perfumería', categoriaId: cuidado });
      await mov(madre, { tipo: 'gasto', monto: '74000.00', fecha: fecha(mes, diaValido(mes, 6)), descripcion: 'Supermercado', categoriaId: cat('Alimentos') });
    } else {
      await mov(madre, { tipo: 'gasto', monto: entre(60000, 110000), fecha: fecha(mes, 9), descripcion: 'Supermercado', categoriaId: cat('Alimentos') });
      await mov(madre, { tipo: 'gasto', monto: entre(25000, 40000), fecha: fecha(mes, 13), descripcion: 'Peluquería', categoriaId: cuidado });
      await mov(madre, { tipo: 'gasto', monto: entre(30000, 90000), fecha: fecha(mes, 22), descripcion: unoDe(['Ropa para los chicos', 'Zapatillas']), categoriaId: cat('Ropa') });
      await mov(madre, { tipo: 'gasto', monto: entre(12000, 30000), fecha: fecha(mes, 18), descripcion: 'Farmacia', categoriaId: cat('Salud') });
      await mov(madre, { tipo: 'gasto', monto: entre(15000, 25000), fecha: fecha(mes, 25), descripcion: 'Clases de inglés de Sofi', categoriaId: cat('Educación') });
    }
    // Tomi (13) y Sofi (10): mesada y gastos chicos.
    await mov(hijo1, { tipo: 'ingreso', monto: '30000.00', fecha: fecha(mes, 1), descripcion: 'Mesada' });
    for (const d of actual ? [3, 8] : [4, 15, 25]) await mov(hijo1, { tipo: 'gasto', monto: entre(2000, 5000), fecha: fecha(mes, diaValido(mes, d)), descripcion: 'Kiosco', categoriaId: cat('Alimentos') });
    if (!actual) await mov(hijo1, { tipo: 'gasto', monto: entre(6000, 10000), fecha: fecha(mes, 20), descripcion: 'Salida con amigos', categoriaId: cat('Entretenimiento') });
    await mov(hijo1, { tipo: 'gasto', monto: '5000.00', fecha: fecha(mes, diaValido(mes, 2)), descripcion: 'Carga SUBE', categoriaId: cat('Transporte') });
    await mov(hijo2, { tipo: 'ingreso', monto: '15000.00', fecha: fecha(mes, 1), descripcion: 'Mesada' });
    await mov(hijo2, { tipo: 'gasto', monto: entre(2000, 5000), fecha: fecha(mes, diaValido(mes, 9)), descripcion: unoDe(['Golosinas', 'Figuritas']), categoriaId: cat('Entretenimiento') });
  }

  // 7) Gastos compartidos del grupo y pagos entre adultos.
  const gastoGrupo = (quien, datos) => exigir(quien.post(`/api/grupos/${grupoId}/gastos`).send(datos), 201, `gasto de grupo ${datos.descripcion}`);
  // Carlos le devuelve a Laura la diferencia de cada mes (105.000 − 80.000 = 25.000) cada tanto, no todos los
  // meses: así el gráfico de saldos del grupo muestra la deuda que crece y se salda.
  const devoluciones = { [MESES[1]]: '50000.00', [MESES[4]]: '75000.00' };
  for (const mes of MESES) {
    const actual = mes === MES_ACTUAL;
    await gastoGrupo(madre, { pagadorId: id.madre, monto: '210000.00', fecha: fecha(mes, diaValido(mes, 10)), descripcion: 'Cuota del colegio', categoriaId: cat('Educación'),
      participantes: [{ usuarioId: id.padre, monto: '105000.00' }, { usuarioId: id.madre, monto: '105000.00' }] });
    if (!actual) {
      await gastoGrupo(padre, { pagadorId: id.padre, monto: '160000.00', fecha: fecha(mes, 20), descripcion: 'Compra mayorista', categoriaId: cat('Alimentos'),
        participantes: [{ usuarioId: id.padre, monto: '80000.00' }, { usuarioId: id.madre, monto: '80000.00' }] });
      if (devoluciones[mes]) {
        await exigir(padre.post(`/api/grupos/${grupoId}/pagos`).send({ deudorId: id.padre, acreedorId: id.madre, monto: devoluciones[mes], fecha: fecha(mes, 28), nota: 'Devolución de la diferencia del colegio' }), 201, 'pago entre miembros');
      }
    } else {
      await gastoGrupo(padre, { pagadorId: id.padre, monto: '36000.00', fecha: fecha(mes, diaValido(mes, 8)), descripcion: 'Pizza en familia', categoriaId: cat('Entretenimiento'),
        participantes: [{ usuarioId: id.padre, monto: '18000.00' }, { usuarioId: id.madre, monto: '18000.00' }] });
    }
  }

  // 8) Gastos fijos: simples, con débito y con tarjeta de crédito en cuotas. Las cuotas de meses anteriores ya están pagas.
  async function gastoFijo(quien, datos) {
    const g = await exigir(quien.post('/api/gastos-fijos').send(datos), 201, `gasto fijo ${datos.nombre}`);
    const detalle = await exigir(quien.get(`/api/gastos-fijos/${g.id}`), 200, 'detalle del gasto fijo');
    for (const cuota of detalle.cuotas ?? []) {
      if (cuota.mes < MES_ACTUAL && cuota.estado === 'pendiente') {
        await exigir(quien.post(`/api/gastos-fijos/${g.id}/cuotas/${cuota.id}/pagar`).send({ fecha: cuota.fechaVencimiento }), [200, 201], `pagar ${datos.nombre} ${cuota.mes}`);
      }
    }
  }
  const inicio = MESES[0];
  await gastoFijo(padre, { nombre: 'Alquiler', diaVencimiento: 10, categoriaId: cat('Vivienda'),
    conceptos: [{ nombre: 'Alquiler del departamento', montoTotal: '450000.00', recurrente: true, mesInicio: inicio }] });
  await gastoFijo(padre, { nombre: 'Servicios del hogar', diaVencimiento: 15, categoriaId: cat('Servicios'),
    conceptos: [{ nombre: 'Internet fibra', montoTotal: '28000.00', recurrente: true, mesInicio: inicio }, { nombre: 'Planes de celular', montoTotal: '35000.00', recurrente: true, mesInicio: inicio }] });
  await gastoFijo(padre, { nombre: 'Seguro del auto', diaVencimiento: 20, categoriaId: cat('Transporte'), tipoPago: 'tarjeta_debito',
    ultimosCuatro: '1234', banco: 'Banco Demo', titular: 'Carlos Pérez', alias: 'Débito sueldo',
    conceptos: [{ nombre: 'Póliza todo riesgo', montoTotal: '45000.00', recurrente: true, mesInicio: inicio }] });
  await gastoFijo(padre, { nombre: 'Mastercard de Carlos', diaVencimiento: 26, categoriaId: cat('Otros'), tipoPago: 'tarjeta_credito',
    ultimosCuatro: '5507', banco: 'Banco Demo', titular: 'Carlos Pérez', alias: 'Crédito personal',
    conceptos: [
      { nombre: 'Notebook en 6 cuotas', montoTotal: '720000.00', cuotas: 6, mesInicio: MESES[3] },
      { nombre: 'Streaming (Netflix y Spotify)', montoTotal: '19000.00', recurrente: true, mesInicio: inicio },
    ] });
  await gastoFijo(madre, { nombre: 'Visa familiar', diaVencimiento: 22, categoriaId: cat('Vivienda'), tipoPago: 'tarjeta_credito',
    ultimosCuatro: '4821', banco: 'Banco Demo', titular: 'Laura Gómez', alias: 'Crédito familiar',
    conceptos: [
      { nombre: 'Heladera en 12 cuotas', montoTotal: '1080000.00', cuotas: 12, mesInicio: inicio },
      { nombre: 'Celular de Tomi en 6 cuotas', montoTotal: '360000.00', cuotas: 6, mesInicio: MESES[2] },
    ] });

  // 9) Metas de ahorro en pesos y en dólares, personales y del grupo.
  async function meta(quien, datos, aportes) {
    const m = await exigir(quien.post('/api/metas').send(datos), 201, `meta ${datos.nombre}`);
    for (const [quienAporta, monto, f] of aportes) await exigir((quienAporta || quien).post(`/api/metas/${m.id}/aportes`).send({ monto, fecha: f }), 201, `aporte a ${datos.nombre}`);
  }
  await meta(padre, { nombre: 'Vacaciones en la costa', montoObjetivo: '1800000.00', fechaLimite: `${anioHoy + 1}-01-15` },
    MESES.map((mes) => [null, '150000.00', fecha(mes, diaValido(mes, 6))]));
  await meta(padre, { nombre: 'Fondo de emergencia', montoObjetivo: '2000.00', moneda: 'USD' },
    MESES.map((mes) => [null, '200.00', fecha(mes, diaValido(mes, 7))]));
  await meta(madre, { nombre: 'Smart TV para el living', montoObjetivo: '900000.00', grupoId, fechaLimite: `${anioHoy}-12-20` },
    MESES.slice(2).flatMap((mes) => [[madre, '60000.00', fecha(mes, diaValido(mes, 8))], [padre, '50000.00', fecha(mes, diaValido(mes, 9))]]));
  await meta(hijo1, { nombre: 'Bicicleta', montoObjetivo: '250000.00' },
    MESES.slice(1).map((mes) => [null, '15000.00', fecha(mes, diaValido(mes, 2))]));

  console.log(`Datos de demostración cargados (${MESES[0]} a ${MES_ACTUAL}).`);
  console.log('Cuentas (solo para demostración), todas con la contraseña de DEMO_CLAVE en backend/.env:');
  for (const m of FAMILIA) console.log(`  ${m.nombre.padEnd(14)} ${correo(m.clave).padEnd(26)} ${m.rol}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
