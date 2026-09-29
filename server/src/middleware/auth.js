import jwt from 'jsonwebtoken';
import { ErrorHttp } from '../utils/errores.js';

export function requiereAuth(jwtSecret) {
  return (req, _res, next) => {
    const [tipo, token] = (req.headers.authorization || '').split(' ');
    if (tipo !== 'Bearer' || !token) {
      return next(new ErrorHttp(401, 'Se requiere autenticación.'));
    }
    try {
      req.usuario = jwt.verify(token, jwtSecret);
      return next();
    } catch {
      return next(new ErrorHttp(401, 'La sesión no es válida o ha expirado.'));
    }
  };
}
