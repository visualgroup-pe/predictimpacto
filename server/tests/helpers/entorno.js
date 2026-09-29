import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { crearApp } from '../../src/app.js';
import { conectar } from '../../src/config/db.js';
import { Producto, Venta, Prediccion, Usuario } from '../../src/models/index.js';

process.env.NODE_ENV = 'test';
const dir = path.dirname(fileURLToPath(import.meta.url));
export const JWT_SECRET = 'secreto-de-pruebas';
export const CREDENCIALES = { usuario: 'analista', password: 'clave-de-pruebas' };
export const INICIO_PREDICCION = '2024-01-15';

const DIA = 86_400_000;
const d = (iso) => new Date(`${iso}T00:00:00Z`);
const mas = (fecha, dias) => new Date(fecha.getTime() + dias * DIA);

export const productosFixture = [
  // Existencias elegidas para obtener un estado de cada tipo.
  {
    sku: 'CAF-001',
    nombre: 'CAFÉ',
    categoria: 'Bebidas',
    nivelServicio: 0.95,
    leadTimeDias: 2,
    existenciaActual: 5,
    existenciaMinima: 10,
  },
  {
    sku: 'KEK-003',
    nombre: 'KEKE',
    categoria: 'Pastelería',
    nivelServicio: 0.9,
    leadTimeDias: 1,
    existenciaActual: 7,
    existenciaMinima: 3,
  },
  {
    sku: 'GAL-010',
    nombre: 'GALLETA',
    categoria: 'Pastelería',
    nivelServicio: 0.9,
    leadTimeDias: 1,
    existenciaActual: 50,
    existenciaMinima: 3,
  },
];

export async function iniciar() {
  const mongo = await MongoMemoryServer.create();
  try {
    await conectar(mongo.getUri('predictimpacto-test'));
  } catch (err) {
    await mongoose.disconnect();
    await mongo.stop();
    throw err;
  }
  const app = crearApp({
    jwtSecret: JWT_SECRET,
    metricasPath: path.resolve(dir, '../../../data/metricas.json'),
  });
  return { mongo, app };
}

export async function sembrar() {
  await Promise.all([Producto, Venta, Prediccion, Usuario].map((m) => m.deleteMany({})));
  await Producto.insertMany(productosFixture);
  await Usuario.create({
    usuario: CREDENCIALES.usuario,
    passwordHash: await bcrypt.hash(CREDENCIALES.password, 4),
  });

  // Ventas: 14 días (lunes 2024-01-01 a domingo 2024-01-14), unidades = día + 1 para CAFÉ,
  // 2 fijas para KEKE y 1 para GALLETA.
  const ventas = [];
  for (let i = 0; i < 14; i += 1) {
    const fecha = mas(d('2024-01-01'), i);
    ventas.push({ sku: 'CAF-001', fecha, unidades: i + 1 });
    ventas.push({ sku: 'KEK-003', fecha, unidades: 2 });
    ventas.push({ sku: 'GAL-010', fecha, unidades: 1 });
  }
  await Venta.insertMany(ventas);

  // Predicciones: 90 días. CAFÉ alterna 10/14, KEKE alterna 3/5, GALLETA constante 1.
  const generadoEn = d('2024-01-14');
  const preds = [];
  for (let i = 0; i < 90; i += 1) {
    const fecha = mas(d(INICIO_PREDICCION), i);
    const base = { fecha, modeloVersion: 'rf-test', generadoEn };
    preds.push({ ...base, sku: 'CAF-001', demandaPredicha: i % 2 === 0 ? 10 : 14 });
    preds.push({ ...base, sku: 'KEK-003', demandaPredicha: i % 2 === 0 ? 3 : 5 });
    preds.push({ ...base, sku: 'GAL-010', demandaPredicha: 1 });
  }
  await Prediccion.insertMany(preds);
}

export async function obtenerToken(app) {
  const res = await request(app).post('/api/v1/auth/login').send(CREDENCIALES);
  return res.body.token;
}

export async function detener(mongo) {
  await mongoose.disconnect();
  await mongo.stop();
}
