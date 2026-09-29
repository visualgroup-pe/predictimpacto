import { Router } from 'express';
import { Venta } from '../models/index.js';
import { parsearEnum, parsearRango, parsearSku } from '../utils/validacion.js';

const router = Router();

/**
 * Serie de ventas agregada en MongoDB. Cada fila es un periodo con una
 * propiedad por SKU (formato ancho listo para graficar) y el total del periodo.
 */
router.get('/', async (req, res) => {
  const sku = await parsearSku(req.query.sku);
  const { desde, hasta } = parsearRango(req.query);
  const granularidad = parsearEnum(
    req.query.granularidad,
    'granularidad',
    ['diaria', 'semanal'],
    'diaria',
  );

  const filtro = {};
  if (sku) filtro.sku = sku;
  if (desde || hasta) {
    filtro.fecha = {};
    if (desde) filtro.fecha.$gte = desde;
    if (hasta) filtro.fecha.$lte = hasta;
  }

  const periodo =
    granularidad === 'semanal'
      ? { $dateTrunc: { date: '$fecha', unit: 'week', startOfWeek: 'monday', timezone: 'UTC' } }
      : '$fecha';

  const datos = await Venta.aggregate([
    { $match: filtro },
    { $group: { _id: { periodo, sku: '$sku' }, unidades: { $sum: '$unidades' } } },
    {
      $group: {
        _id: '$_id.periodo',
        total: { $sum: '$unidades' },
        valores: { $push: { k: '$_id.sku', v: '$unidades' } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            { fecha: { $dateToString: { format: '%Y-%m-%d', date: '$_id' } }, total: '$total' },
            { $arrayToObject: '$valores' },
          ],
        },
      },
    },
  ]);

  const skus = sku ? [sku] : await Venta.distinct('sku', filtro);
  const [rango] = await Venta.aggregate([
    { $group: { _id: null, min: { $min: '$fecha' }, max: { $max: '$fecha' } } },
  ]);
  const iso = (f) => f.toISOString().slice(0, 10);

  res.json({
    granularidad,
    sku: sku ?? 'TODOS',
    desde: desde?.toISOString().slice(0, 10) ?? null,
    hasta: hasta?.toISOString().slice(0, 10) ?? null,
    rangoDisponible: rango ? { min: iso(rango.min), max: iso(rango.max) } : null,
    skus: skus.sort(),
    total: datos.length,
    datos,
  });
});

export default router;
