import mongoose from 'mongoose';

// Colección auxiliar de autenticación (no forma parte del modelo analítico).
const usuarioSchema = new mongoose.Schema(
  {
    usuario: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { collection: 'usuarios', versionKey: false },
);

export default mongoose.model('Usuario', usuarioSchema);
