import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models/index.js';
import { ErrorHttp, solicitudInvalida } from '../utils/errores.js';

export default function rutasAuth({ jwtSecret, jwtExpiresIn }) {
  const router = Router();

  router.post('/login', async (req, res) => {
    const { usuario, password } = req.body ?? {};
    if (typeof usuario !== 'string' || typeof password !== 'string' || !usuario || !password) {
      throw solicitudInvalida('Debe indicar usuario y contraseña.');
    }
    const registro = await Usuario.findOne({ usuario: usuario.trim() }).lean();
    const valido = registro && (await bcrypt.compare(password, registro.passwordHash));
    if (!valido) throw new ErrorHttp(401, 'Usuario o contraseña incorrectos.');

    const token = jwt.sign({ sub: registro.usuario }, jwtSecret, { expiresIn: jwtExpiresIn });
    res.json({ token, usuario: registro.usuario });
  });

  return router;
}
