import { Router } from 'express';
import { Prediccion, Producto, Recomendacion } from '../models/index.js';
import { parsearSku } from '../utils/validacion.js';
import { calcularRecomendacion, ordenarRecomendaciones } from '../services/reposicion.js';
import { HORIZONTE_MAXIMO } from './predicciones.js';

const router = Router();

/**
 * Ejecuta el motor de reposición sobre el horizonte completo de predicción,
 * persiste el resultado en la colección recomendaciones (upsert por sku+fecha)
 * y devuelve una fila por producto, con los críticos primero.
 */
router.get('/', async (req, res) => {
  const sku = await parsearSku(req.query.sku);
  const productos = await Producto.find(sku ? { sku } : {}).lean();

  const series = await Prediccion.aggregate([
    { $match: sku ? { sku } : {} },
    { $sort: { sku: 1, fecha: 1 } },
    {
      $group: {
        _id: '$sku',
        inicio: { $first: '$fecha' },
        demanda: { $push: '$demandaPredicha' },
      },
    },
    { $project: { inicio: 1, demanda: { $slice: ['$demanda', HORIZONTE_MAXIMO] } } },
  ]);
  const porSku = new Map(series.map((s) => [s._id, s]));

  const filas = productos
    .filter((p) => porSku.has(p.sku))
    .map((p) => ({
      ...calcularRecomendacion(p, porSku.get(p.sku).demanda),
      fecha: porSku.get(p.sku).inicio,
    }));

  if (filas.length > 0) {
    await Recomendacion.bulkWrite(
      filas.map((f) => ({
        updateOne: {
          filter: { sku: f.sku, fecha: f.fecha },
          update: {
            $set: {
              demandaProyectada7d: f.demandaProyectada7d,
              stockSeguridad: f.stockSeguridad,
              puntoReorden: f.puntoReorden,
              estado: f.estado,
              accionSugerida: f.accionSugerida,
            },
          },
          upsert: true,
        },
      })),
    );
  }

  const ordenadas = ordenarRecomendaciones(filas).map(({ fecha, sigma, z, mediaDiaria, ...f }) => ({
    ...f,
    fecha: fecha.toISOString().slice(0, 10),
    sigma: Math.round(sigma * 1000) / 1000,
    z: Math.round(z * 1000) / 1000,
    mediaDiaria: Math.round(mediaDiaria * 1000) / 1000,
  }));

  const resumen = { critico: 0, moderado: 0, estable: 0 };
  for (const f of ordenadas) resumen[f.estado] += 1;

  res.json({ total: ordenadas.length, resumen, datos: ordenadas });
});

export default router;
