import mongoose from 'mongoose';

export const ESTADOS = ['critico', 'moderado', 'estable'];

const recomendacionSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, uppercase: true, trim: true },
    fecha: { type: Date, required: true },
    demandaProyectada7d: { type: Number, required: true, min: 0 },
    stockSeguridad: { type: Number, required: true, min: 0 },
    puntoReorden: { type: Number, required: true, min: 0 },
    estado: { type: String, required: true, enum: ESTADOS },
    accionSugerida: { type: String, required: true },
  },
  { collection: 'recomendaciones', versionKey: false },
);

recomendacionSchema.index({ sku: 1, fecha: 1 }, { unique: true });

export default mongoose.model('Recomendacion', recomendacionSchema);
