import mongoose from 'mongoose';
import Producto from './Producto.js';
import Venta from './Venta.js';
import Prediccion from './Prediccion.js';
import Recomendacion from './Recomendacion.js';
import Usuario from './Usuario.js';
import { jsonSchemas } from './esquemas.js';

export { Producto, Venta, Prediccion, Recomendacion, Usuario, jsonSchemas };

const modelos = [Producto, Venta, Prediccion, Recomendacion, Usuario];

/**
 * Crea (o actualiza con collMod) cada colección con su validador $jsonSchema
 * en modo estricto y sincroniza los índices declarados en los esquemas.
 */
export async function aplicarValidadores(conn = mongoose.connection) {
  const db = conn.db;
  const existentes = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name),
  );

  for (const [nombre, schema] of Object.entries(jsonSchemas)) {
    const opciones = {
      validator: { $jsonSchema: schema },
      validationLevel: 'strict',
      validationAction: 'error',
    };
    if (existentes.has(nombre)) {
      await db.command({ collMod: nombre, ...opciones });
    } else {
      await db.createCollection(nombre, opciones);
    }
  }

  await Promise.all(modelos.map((m) => m.syncIndexes()));
}
