import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export const entorno = {
  mongodbUri: process.env.MONGODB_URI,
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  metricasPath: process.env.METRICAS_PATH || path.join(raiz, 'data', 'metricas.json'),
  clientDist: path.join(raiz, 'client', 'dist'),
};
