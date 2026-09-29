import { Router } from 'express';
import { parsearSku } from '../utils/validacion.js';
import { generarRecomendaciones } from '../services/recomendaciones.js';

const router = Router();
const r3 = (x) => Math.round(x * 1000) / 1000;

router.get('/', async (req, res) => {
  const sku = await parsearSku(req.query.sku);
  const filas = await generarRecomendaciones({ sku });

  const datos = filas.map(({ fecha, sigma, z, mediaDiaria, ...f }) => ({
    ...f,
    fecha: fecha.toISOString().slice(0, 10),
    sigma: r3(sigma),
    z: r3(z),
    mediaDiaria: r3(mediaDiaria),
  }));

  const resumen = { critico: 0, moderado: 0, estable: 0 };
  for (const f of datos) resumen[f.estado] += 1;

  res.json({ total: datos.length, resumen, datos });
});

export default router;
