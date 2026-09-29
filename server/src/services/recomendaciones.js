import { Prediccion, Producto, Recomendacion } from '../models/index.js';
import { calcularRecomendacion, ordenarRecomendaciones } from './reposicion.js';

export const HORIZONTE_MAXIMO = 90;

/**
 * Ejecuta el motor de reposición sobre el horizonte completo de predicción,
 * persiste el resultado en la colección recomendaciones (upsert por sku+fecha)
 * y devuelve una fila por producto, con los críticos primero.
 */
export async function generarRecomendaciones({ sku } = {}) {
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

  return ordenarRecomendaciones(filas);
}
