import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { existsSync } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import rutasAuth from './routes/auth.js';
import productos from './routes/productos.js';
import ventas from './routes/ventas.js';
import predicciones from './routes/predicciones.js';
import rutasMetricas from './routes/metricas.js';
import recomendaciones from './routes/recomendaciones.js';
import { requiereAuth } from './middleware/auth.js';
import { manejadorErrores, noEncontrado } from './middleware/errores.js';

export function crearApp({ jwtSecret, jwtExpiresIn = '8h', metricasPath, clientDist } = {}) {
  if (!jwtSecret) throw new Error('Falta la variable de entorno JWT_SECRET');

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  const api = express.Router();
  api.get('/salud', (_req, res) =>
    res.json({ estado: 'ok', mongo: mongoose.connection.readyState === 1 }),
  );
  api.use('/auth', rutasAuth({ jwtSecret, jwtExpiresIn }));
  api.use(requiereAuth(jwtSecret));
  api.use('/productos', productos);
  api.use('/ventas', ventas);
  api.use('/predicciones', predicciones);
  api.use('/metricas', rutasMetricas({ metricasPath }));
  api.use('/recomendaciones', recomendaciones);
  app.use('/api/v1', api);
  app.use('/api', noEncontrado);

  // En producción la API también sirve el build del cliente (SPA).
  if (clientDist && existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('/{*ruta}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(noEncontrado);
  app.use(manejadorErrores);
  return app;
}
