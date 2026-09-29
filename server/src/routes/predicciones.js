import { Router } from 'express';
import { Prediccion, Producto } from '../models/index.js';
import { parsearEntero, parsearSku } from '../utils/validacion.js';

export const HORIZONTE_MAXIMO = 90;
const DIA_MS = 86_400_000;

const router = Router();

router.get('/', async (req, res) => {
  const sku = await parsearSku(req.query.sku);
  const horizonte = parsearEntero(req.query.horizonte, 'horizonte', {
    min: 1,
    max: HORIZONTE_MAXIMO,
    porDefecto: HORIZONTE_MAXIMO,
  });

  const primera = await Prediccion.findOne({}, { fecha: 1, modeloVersion: 1, generadoEn: 1 })
    .sort({ fecha: 1 })
    .lean();
  if (!primera) {
    return res.json({ horizonte, desde: null, hasta: null, resumen: [], datos: [] });
  }

  const inicio = primera.fecha;
  const fin = new Date(inicio.getTime() + (horizonte - 1) * DIA_MS);
  const filtro = { fecha: { $gte: inicio, $lte: fin } };
  if (sku) filtro.sku = sku;

  const [{ serie, resumen }] = await Prediccion.aggregate([
    { $match: filtro },
    {
      $facet: {
        serie: [
          {
            $group: {
              _id: '$fecha',
              total: { $sum: '$demandaPredicha' },
              valores: { $push: { k: '$sku', v: '$demandaPredicha' } },
            },
          },
          { $sort: { _id: 1 } },
          {
            $replaceRoot: {
              newRoot: {
                $mergeObjects: [
                  {
                    fecha: { $dateToString: { format: '%Y-%m-%d', date: '$_id' } },
                    total: '$total',
                  },
                  { $arrayToObject: '$valores' },
                ],
              },
            },
          },
        ],
        resumen: [
          {
            $group: {
              _id: '$sku',
              total: { $sum: '$demandaPredicha' },
              promedioDiario: { $avg: '$demandaPredicha' },
              minimo: { $min: '$demandaPredicha' },
              maximo: { $max: '$demandaPredicha' },
              dias: { $sum: 1 },
            },
          },
          { $sort: { total: -1, _id: 1 } },
        ],
      },
    },
  ]);

  const nombres = Object.fromEntries(
    (await Producto.find({}, { sku: 1, nombre: 1 }).lean()).map((p) => [p.sku, p.nombre]),
  );

  res.json({
    horizonte,
    sku: sku ?? 'TODOS',
    desde: inicio.toISOString().slice(0, 10),
    hasta: fin.toISOString().slice(0, 10),
    modeloVersion: primera.modeloVersion,
    generadoEn: primera.generadoEn,
    resumen: resumen.map(({ _id, promedioDiario, ...r }) => ({
      sku: _id,
      nombre: nombres[_id] ?? _id,
      ...r,
      promedioDiario: Math.round(promedioDiario * 1000) / 1000,
    })),
    datos: serie,
  });
});

export default router;
