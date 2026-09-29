import request from 'supertest';
import mongoose from 'mongoose';
import {
  iniciar,
  sembrar,
  obtenerToken,
  detener,
  CREDENCIALES,
  INICIO_PREDICCION,
} from './helpers/entorno.js';
import { Recomendacion } from '../src/models/index.js';

let mongo;
let app;
let token;
const get = (url) => request(app).get(url).set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
  ({ mongo, app } = await iniciar());
  await sembrar();
  token = await obtenerToken(app);
});

afterAll(async () => {
  if (mongo) await detener(mongo);
});

describe('autenticación', () => {
  test('login correcto devuelve un JWT', async () => {
    const res = await request(app).post('/api/v1/auth/login').send(CREDENCIALES);
    expect(res.status).toBe(200);
    expect(res.body.token.split('.')).toHaveLength(3);
    expect(res.body.usuario).toBe(CREDENCIALES.usuario);
  });

  test('credenciales incorrectas → 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ ...CREDENCIALES, password: 'otra' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/incorrectos/);
  });

  test('cuerpo incompleto → 400', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ usuario: 'x' });
    expect(res.status).toBe(400);
  });

  test.each(['productos', 'ventas', 'predicciones', 'metricas', 'recomendaciones'])(
    '/%s sin token → 401',
    async (ruta) => {
      const res = await request(app).get(`/api/v1/${ruta}`);
      expect(res.status).toBe(401);
    },
  );

  test('token manipulado → 401', async () => {
    const res = await request(app)
      .get('/api/v1/productos')
      .set('Authorization', `Bearer ${token}x`);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/productos', () => {
  test('lista los productos ordenados por SKU', async () => {
    const res = await get('/api/v1/productos');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.datos.map((p) => p.sku)).toEqual(['CAF-001', 'GAL-010', 'KEK-003']);
    expect(res.body.datos[0]).not.toHaveProperty('_id');
  });
});

describe('GET /api/v1/ventas', () => {
  test('agregación diaria en formato ancho por SKU', async () => {
    const res = await get('/api/v1/ventas?desde=2024-01-01&hasta=2024-01-03');
    expect(res.status).toBe(200);
    expect(res.body.granularidad).toBe('diaria');
    expect(res.body.skus).toEqual(['CAF-001', 'GAL-010', 'KEK-003']);
    expect(res.body.rangoDisponible).toEqual({ min: '2024-01-01', max: '2024-01-14' });
    expect(res.body.datos).toEqual([
      { fecha: '2024-01-01', total: 4, 'CAF-001': 1, 'KEK-003': 2, 'GAL-010': 1 },
      { fecha: '2024-01-02', total: 5, 'CAF-001': 2, 'KEK-003': 2, 'GAL-010': 1 },
      { fecha: '2024-01-03', total: 6, 'CAF-001': 3, 'KEK-003': 2, 'GAL-010': 1 },
    ]);
  });

  test('agregación semanal (semanas que inician en lunes) filtrada por SKU', async () => {
    const res = await get('/api/v1/ventas?sku=caf-001&granularidad=semanal');
    expect(res.status).toBe(200);
    expect(res.body.sku).toBe('CAF-001');
    // Semana 1: 1..7 = 28; semana 2: 8..14 = 77
    expect(res.body.datos).toEqual([
      { fecha: '2024-01-01', total: 28, 'CAF-001': 28 },
      { fecha: '2024-01-08', total: 77, 'CAF-001': 77 },
    ]);
  });

  test.each([
    ['granularidad=mensual', /granularidad/],
    ['desde=2024-13-01', /desde/],
    ['hasta=01-01-2024', /AAAA-MM-DD/],
    ['desde=2024-02-30', /no es una fecha válida/],
    ['desde=2024-02-01&hasta=2024-01-01', /posterior/],
    ['sku=NOEXISTE', /no existe/],
    ['sku=caf%20001', /formato inválido/],
    ['sku=CAF-001&sku=KEK-003', /una sola vez/],
  ])('parámetros inválidos (%s) → 400', async (qs, mensaje) => {
    const res = await get(`/api/v1/ventas?${qs}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(mensaje);
  });
});

describe('GET /api/v1/predicciones', () => {
  test('horizonte de 90 días con resumen por producto', async () => {
    const res = await get('/api/v1/predicciones');
    expect(res.status).toBe(200);
    expect(res.body.horizonte).toBe(90);
    expect(res.body.desde).toBe(INICIO_PREDICCION);
    expect(res.body.hasta).toBe('2024-04-13');
    expect(res.body.datos).toHaveLength(90);
    const cafe = res.body.resumen.find((r) => r.sku === 'CAF-001');
    expect(cafe).toEqual({
      sku: 'CAF-001',
      nombre: 'CAFÉ',
      total: 1080,
      promedioDiario: 12,
      minimo: 10,
      maximo: 14,
      dias: 90,
    });
    expect(res.body.resumen[0].sku).toBe('CAF-001'); // ordenado por total descendente
  });

  test('horizonte reducido y filtro por SKU', async () => {
    const res = await get('/api/v1/predicciones?sku=KEK-003&horizonte=7');
    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(7);
    expect(res.body.resumen).toHaveLength(1);
    expect(res.body.resumen[0].total).toBe(3 + 5 + 3 + 5 + 3 + 5 + 3);
  });

  test.each(['0', '91', 'abc', '7.5', '-3'])('horizonte=%s → 400', async (h) => {
    const res = await get(`/api/v1/predicciones?horizonte=${h}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/entre 1 y 90/);
  });
});

describe('GET /api/v1/metricas', () => {
  test('devuelve el modelo seleccionado y la tabla comparativa', async () => {
    const res = await get('/api/v1/metricas');
    expect(res.status).toBe(200);
    expect(res.body.modeloSeleccionado).toBe('Random Forest');
    expect(res.body.metricas).toEqual({
      modelo: 'Random Forest',
      mae: 2.3101,
      rmse: 5.552,
      r2: 0.6803,
    });
    expect(res.body.modelos.map((m) => m.modelo)).toEqual([
      'Random Forest',
      'LightGBM',
      'Gradient Boosting',
      'SVR',
      'XGBoost',
    ]);
  });
});

describe('GET /api/v1/recomendaciones', () => {
  test('ejecuta el motor, ordena críticos primero y persiste el resultado', async () => {
    const res = await get('/api/v1/recomendaciones');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.resumen).toEqual({ critico: 1, moderado: 1, estable: 1 });
    expect(res.body.datos.map((f) => f.estado)).toEqual(['critico', 'moderado', 'estable']);

    const cafe = res.body.datos[0];
    // σ de la serie 10/14 (90 días) = 2·√(90/89); z(0.95) = 1.645; L = 2
    // SS = ⌈1.645 × 2.0112 × √2⌉ = ⌈4.679⌉ = 5; ROP = ⌈12 × 2 + 5⌉ = 29
    expect(cafe).toMatchObject({
      sku: 'CAF-001',
      fecha: INICIO_PREDICCION,
      demandaProyectada7d: 10 + 14 + 10 + 14 + 10 + 14 + 10,
      stockSeguridad: 5,
      puntoReorden: 29,
      estado: 'critico',
      accionSugerida: `Producir lote extra de ${29 + 82 - 5} uds.`,
    });

    expect(await Recomendacion.countDocuments()).toBe(3);
    // Idempotente: ejecutar de nuevo no duplica documentos.
    await get('/api/v1/recomendaciones');
    expect(await Recomendacion.countDocuments()).toBe(3);
  });

  test('filtro por SKU', async () => {
    const res = await get('/api/v1/recomendaciones?sku=GAL-010');
    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(1);
    expect(res.body.datos[0].accionSugerida).toBe('Mantener producción actual');
  });
});

describe('validación $jsonSchema a nivel de colección', () => {
  // Se usa el driver nativo para saltarse la validación de Mongoose y comprobar la de MongoDB.
  const col = (nombre) => mongoose.connection.db.collection(nombre);

  test.each([
    ['productos', { sku: 'X-1', nombre: 'Sin campos obligatorios' }],
    [
      'productos',
      {
        sku: 'X-1',
        nombre: 'N',
        categoria: 'C',
        nivelServicio: 1.5,
        leadTimeDias: 1,
        existenciaActual: 1,
        existenciaMinima: 1,
      },
    ],
    ['ventas', { sku: 'CAF-001', fecha: '2024-01-01', unidades: 3 }],
    ['ventas', { sku: 'CAF-001', fecha: new Date(), unidades: 'tres' }],
    ['predicciones', { sku: 'CAF-001', fecha: new Date(), demandaPredicha: 1 }],
    [
      'recomendaciones',
      {
        sku: 'CAF-001',
        fecha: new Date(),
        demandaProyectada7d: 1,
        stockSeguridad: 1,
        puntoReorden: 1,
        estado: 'urgente',
        accionSugerida: 'x',
      },
    ],
  ])('rechaza documento inválido en %s', async (nombre, doc) => {
    await expect(col(nombre).insertOne(doc)).rejects.toMatchObject({ code: 121 });
  });

  test('índice compuesto {sku, fecha} en ventas y predicciones', async () => {
    for (const nombre of ['ventas', 'predicciones']) {
      const indices = await col(nombre).indexes();
      expect(indices.some((i) => JSON.stringify(i.key) === '{"sku":1,"fecha":1}')).toBe(true);
    }
  });
});

describe('GET /api/v1/salud', () => {
  test('responde sin autenticación e informa la conexión a MongoDB', async () => {
    const res = await request(app).get('/api/v1/salud');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estado: 'ok', mongo: true });
  });
});

describe('rutas desconocidas', () => {
  test('404 con mensaje', async () => {
    const res = await get('/api/v1/inexistente');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Ruta no encontrada/);
  });
});
