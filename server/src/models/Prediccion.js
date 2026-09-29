import mongoose from 'mongoose';

const prediccionSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, uppercase: true, trim: true },
    fecha: { type: Date, required: true },
    demandaPredicha: { type: Number, required: true, min: 0 },
    modeloVersion: { type: String, required: true },
    generadoEn: { type: Date, required: true },
  },
  { collection: 'predicciones', versionKey: false },
);

prediccionSchema.index({ sku: 1, fecha: 1 }, { unique: true });

export default mongoose.model('Prediccion', prediccionSchema);
