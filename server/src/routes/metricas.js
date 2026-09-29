import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { ErrorHttp } from '../utils/errores.js';

/**
 * Métricas de evaluación de los modelos (resultado del entrenamiento offline).
 * La plataforma no entrena modelos: solo expone el archivo de resultados.
 */
export default function rutasMetricas({ metricasPath }) {
  const router = Router();

  router.get('/', (_req, res) => {
    let contenido;
    try {
      contenido = JSON.parse(readFileSync(metricasPath, 'utf8'));
    } catch {
      throw new ErrorHttp(503, 'No se encontró el archivo de métricas del modelo.');
    }
    const seleccionado = contenido.modelos.find((m) => m.modelo === contenido.modeloSeleccionado);
    res.json({
      modeloSeleccionado: contenido.modeloSeleccionado,
      modeloVersion: contenido.modeloVersion,
      criterioSeleccion: contenido.criterioSeleccion,
      metricas: seleccionado,
      modelos: contenido.modelos,
    });
  });

  return router;
}
