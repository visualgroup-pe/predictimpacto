import { ErrorHttp } from '../utils/errores.js';

export function noEncontrado(req, _res, next) {
  next(new ErrorHttp(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

export function manejadorErrores(err, _req, res, _next) {
  if (err instanceof ErrorHttp) {
    return res.status(err.status).json({ error: err.message, detalles: err.detalles });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la solicitud no es JSON válido.' });
  }
  if (process.env.NODE_ENV !== 'test') console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor.' });
}
