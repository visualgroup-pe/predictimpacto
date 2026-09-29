import { crearApp } from './app.js';
import { conectar } from './config/db.js';
import { entorno } from './config/entorno.js';

try {
  await conectar(entorno.mongodbUri);
  const app = crearApp(entorno);
  app.listen(entorno.port, () => {
    console.log(`API PredictImpacto escuchando en http://localhost:${entorno.port}/api/v1`);
  });
} catch (err) {
  console.error('No se pudo iniciar el servidor:', err.message);
  process.exit(1);
}
