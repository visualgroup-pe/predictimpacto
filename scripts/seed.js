/**
 * Carga de datos hacia MongoDB.
 *
 * Si existen data/productos.csv, data/ventas.csv o data/predicciones.csv se
 * usan esos archivos; para los que falten se generan datos sintéticos
 * coherentes con los resultados de la investigación.
 *
 * Uso: npm run seed   (lee MONGODB_URI, SEED_ADMIN_USER y SEED_ADMIN_PASSWORD de .env)
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { conectar, desconectar } from '../server/src/config/db.js';
import { Producto, Venta, Prediccion, Recomendacion, Usuario } from '../server/src/models/index.js';
import { calcularRecomendacion } from '../server/src/services/reposicion.js';
import { generarRecomendaciones } from '../server/src/services/recomendaciones.js';
import { CATALOGO, MODELO_VERSION, PREDICCION_DESDE } from './lib/catalogo.js';
import { generarPrediccion, generarVentas, resumen, fechaUTC } from './lib/sintetico.js';
import { leerCsv } from './lib/csv.js';

const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
const LOTE = 5000;

function exigir(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(
      `Falta la variable de entorno ${nombre}. Copia .env.example a .env y complétala.`,
    );
    process.exit(1);
  }
  return valor;
}

const num = (v, campo, fila) => {
  const n = Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n))
    throw new Error(`Valor numérico inválido en '${campo}': ${JSON.stringify(fila)}`);
  return n;
};

async function insertarPorLotes(Modelo, docs) {
  for (let i = 0; i < docs.length; i += LOTE) {
    await Modelo.insertMany(docs.slice(i, i + LOTE), { ordered: false, lean: true });
  }
}

function prediccionesSinteticas() {
  const generadoEn = new Date(fechaUTC(PREDICCION_DESDE).getTime() - 86_400_000);
  const docs = [];
  const porSku = new Map();
  CATALOGO.forEach((p, i) => {
    const serie = generarPrediccion(p, 1000 + i);
    const r = resumen(serie);
    if (r.total !== p.total || r.min !== p.min || r.max !== p.max) {
      throw new Error(`La serie sintética de ${p.nombre} no cuadra: ${JSON.stringify(r)}`);
    }
    porSku.set(
      p.sku,
      serie.map((s) => s.valor),
    );
    for (const s of serie) {
      docs.push({
        sku: p.sku,
        fecha: s.fecha,
        demandaPredicha: s.valor,
        modeloVersion: MODELO_VERSION,
        generadoEn,
      });
    }
  });
  return { docs, porSku };
}

function productosSinteticos(porSku) {
  return CATALOGO.map((p) => {
    const base = {
      sku: p.sku,
      nombre: p.nombre,
      categoria: p.categoria,
      nivelServicio: p.nivelServicio,
      leadTimeDias: p.leadTimeDias,
    };
    const { puntoReorden, mediaDiaria } = calcularRecomendacion(
      { ...base, existenciaActual: 0 },
      porSku.get(p.sku),
    );
    return {
      ...base,
      existenciaActual: Math.ceil(puntoReorden * p.factorExistencia),
      existenciaMinima: Math.ceil(mediaDiaria * p.leadTimeDias),
    };
  });
}

async function main() {
  const uri = exigir('MONGODB_URI');
  const usuario = exigir('SEED_ADMIN_USER');
  const password = exigir('SEED_ADMIN_PASSWORD');

  await conectar(uri);
  console.log('Conectado a MongoDB. Limpiando colecciones…');
  await Promise.all([Producto, Venta, Prediccion, Recomendacion].map((m) => m.deleteMany({})));

  // Predicciones
  const csvPred = leerCsv(path.join(DATA, 'predicciones.csv'));
  let predicciones;
  let porSku;
  if (csvPred) {
    predicciones = csvPred.map((f) => ({
      sku: f.sku.toUpperCase(),
      fecha: fechaUTC(f.fecha),
      demandaPredicha: num(f.demandaPredicha, 'demandaPredicha', f),
      modeloVersion: f.modeloVersion || MODELO_VERSION,
      generadoEn: f.generadoEn ? new Date(f.generadoEn) : new Date(),
    }));
    porSku = new Map();
    for (const p of [...predicciones].sort((a, b) => a.fecha - b.fecha)) {
      if (!porSku.has(p.sku)) porSku.set(p.sku, []);
      porSku.get(p.sku).push(p.demandaPredicha);
    }
    console.log(`predicciones: ${predicciones.length} filas desde data/predicciones.csv`);
  } else {
    ({ docs: predicciones, porSku } = prediccionesSinteticas());
    console.log(
      `predicciones: ${predicciones.length} filas sintéticas (90 días × ${CATALOGO.length} productos)`,
    );
  }

  // Productos
  const csvProd = leerCsv(path.join(DATA, 'productos.csv'));
  const productos = csvProd
    ? csvProd.map((f) => ({
        sku: f.sku.toUpperCase(),
        nombre: f.nombre,
        categoria: f.categoria,
        nivelServicio: num(f.nivelServicio, 'nivelServicio', f),
        leadTimeDias: num(f.leadTimeDias, 'leadTimeDias', f),
        existenciaActual: num(f.existenciaActual, 'existenciaActual', f),
        existenciaMinima: num(f.existenciaMinima, 'existenciaMinima', f),
      }))
    : productosSinteticos(porSku);
  console.log(
    `productos: ${productos.length} ${csvProd ? 'desde data/productos.csv' : 'sintéticos'}`,
  );

  // Ventas
  const csvVentas = leerCsv(path.join(DATA, 'ventas.csv'));
  const ventas = csvVentas
    ? csvVentas.map((f) => ({
        sku: f.sku.toUpperCase(),
        fecha: fechaUTC(f.fecha),
        unidades: num(f.unidades, 'unidades', f),
      }))
    : CATALOGO.flatMap((p, i) => generarVentas(p, 2000 + i).map((v) => ({ sku: p.sku, ...v })));
  console.log(
    `ventas: ${ventas.length} filas ${csvVentas ? 'desde data/ventas.csv' : 'sintéticas'}`,
  );

  await Producto.insertMany(productos);
  await insertarPorLotes(Venta, ventas);
  await insertarPorLotes(Prediccion, predicciones);

  await Usuario.findOneAndUpdate(
    { usuario },
    { usuario, passwordHash: await bcrypt.hash(password, 10) },
    { upsert: true },
  );
  console.log(`usuario '${usuario}' listo`);

  const recomendaciones = await generarRecomendaciones();
  console.log('\nRecomendaciones iniciales:');
  console.table(
    recomendaciones.map((r) => ({
      sku: r.sku,
      producto: r.nombre,
      existencia: r.existenciaActual,
      'demanda 7d': r.demandaProyectada7d,
      SS: r.stockSeguridad,
      ROP: r.puntoReorden,
      estado: r.estado,
      accion: r.accionSugerida,
    })),
  );

  await desconectar();
}

main().catch(async (err) => {
  console.error('Error en la siembra:', err.message);
  await desconectar().catch(() => {});
  process.exit(1);
});
