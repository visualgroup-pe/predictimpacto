import mongoose from 'mongoose';
import { aplicarValidadores } from '../models/index.js';

export async function conectar(uri) {
  if (!uri) throw new Error('Falta la variable de entorno MONGODB_URI');
  mongoose.set('strictQuery', true);
  // Las colecciones e índices los crea aplicarValidadores(), con su $jsonSchema.
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });
  await aplicarValidadores();
  return mongoose.connection;
}

export async function desconectar() {
  await mongoose.disconnect();
}
