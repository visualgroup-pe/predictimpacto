import mongoose from 'mongoose';

const productoSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    categoria: { type: String, required: true, trim: true },
    nivelServicio: { type: Number, required: true, min: 0.0001, max: 0.9999 },
    leadTimeDias: { type: Number, required: true, min: 1 },
    existenciaActual: { type: Number, required: true, min: 0 },
    existenciaMinima: { type: Number, required: true, min: 0 },
  },
  { collection: 'productos', versionKey: false },
);

export default mongoose.model('Producto', productoSchema);
