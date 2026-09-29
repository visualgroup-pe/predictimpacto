import mongoose from 'mongoose';

const ventaSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, uppercase: true, trim: true },
    fecha: { type: Date, required: true },
    unidades: { type: Number, required: true, min: 0 },
  },
  { collection: 'ventas', versionKey: false },
);

ventaSchema.index({ sku: 1, fecha: 1 }, { unique: true });

export default mongoose.model('Venta', ventaSchema);
