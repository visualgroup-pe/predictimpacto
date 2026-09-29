import { Router } from 'express';
import { Producto } from '../models/index.js';

const router = Router();

router.get('/', async (_req, res) => {
  const productos = await Producto.find({}, { _id: 0 }).sort({ sku: 1 }).lean();
  res.json({ total: productos.length, datos: productos });
});

export default router;
