/**
 * Motor de reposición de inventario.
 *
 * Metodología (por producto, sobre el horizonte de predicción):
 *   σ_pronóstico   = desviación estándar muestral de la demanda predicha diaria
 *   z              = cuantil de la normal estándar para el nivel de servicio
 *   stockSeguridad = z × σ_pronóstico × √(leadTimeDias)
 *   puntoReorden   = (demanda media diaria predicha × leadTimeDias) + stockSeguridad
 *   estado         = critico  si existenciaActual ≤ puntoReorden
 *                    moderado si existenciaActual ≤ puntoReorden × 1.25
 *                    estable  en otro caso
 *
 * Las cantidades se expresan en unidades enteras redondeando hacia arriba
 * (criterio conservador: nunca se subestima el inventario requerido).
 */

export const FACTOR_MODERADO = 1.25;
export const DIAS_PROYECCION_CORTA = 7;
export const PRIORIDAD_ESTADO = { critico: 0, moderado: 1, estable: 2 };

/**
 * Inversa de la función de distribución normal estándar (Acklam, 2003),
 * con un paso de refinamiento de Halley. Error relativo < 1e-9.
 */
export function cuantilNormal(p) {
  if (!(p > 0 && p < 1)) {
    throw new RangeError('El nivel de servicio debe estar en el intervalo abierto (0, 1)');
  }
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pBajo = 0.02425;
  let x;
  if (p < pBajo) {
    const q = Math.sqrt(-2 * Math.log(p));
    x =
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - pBajo) {
    const q = p - 0.5;
    const r = q * q;
    x =
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x =
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  // Refinamiento de Halley usando erfc.
  const e = 0.5 * erfc(-x / Math.SQRT2) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

// Aproximación de erfc (Numerical Recipes, erfcc), error < 1.2e-7.
function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return x >= 0 ? r : 2 - r;
}

export function media(valores) {
  if (valores.length === 0) return 0;
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

/** Desviación estándar muestral (denominador n − 1). */
export function desviacionEstandar(valores) {
  if (valores.length < 2) return 0;
  const m = media(valores);
  const sc = valores.reduce((s, v) => s + (v - m) ** 2, 0);
  return Math.sqrt(sc / (valores.length - 1));
}

export function clasificarEstado(existenciaActual, puntoReorden) {
  if (existenciaActual <= puntoReorden) return 'critico';
  if (existenciaActual <= puntoReorden * FACTOR_MODERADO) return 'moderado';
  return 'estable';
}

/**
 * Cantidad a producir para volver a cubrir el punto de reorden más la demanda
 * de la próxima semana: ⌈puntoReorden + demanda7d − existenciaActual⌉.
 */
export function cantidadSugerida({ estado, puntoReorden, demandaProyectada7d, existenciaActual }) {
  if (estado === 'estable') return 0;
  return Math.max(1, Math.ceil(puntoReorden + demandaProyectada7d - existenciaActual));
}

export function accionSugerida(estado, cantidad) {
  if (estado === 'critico') return `Producir lote extra de ${cantidad} uds.`;
  if (estado === 'moderado') return `Programar producción de ${cantidad} uds.`;
  return 'Mantener producción actual';
}

/**
 * Calcula la recomendación de un producto.
 * @param {object} producto  documento de la colección productos
 * @param {number[]} demandaPredicha  serie diaria ordenada por fecha (horizonte completo)
 */
export function calcularRecomendacion(producto, demandaPredicha) {
  const { nivelServicio, leadTimeDias, existenciaActual } = producto;
  const sigma = desviacionEstandar(demandaPredicha);
  const mediaDiaria = media(demandaPredicha);
  const z = cuantilNormal(nivelServicio);

  // Un nivel de servicio < 0.5 produce z negativo; el stock de seguridad no puede ser negativo.
  const stockSeguridad = Math.max(0, Math.ceil(z * sigma * Math.sqrt(leadTimeDias)));
  const puntoReorden = Math.ceil(mediaDiaria * leadTimeDias + stockSeguridad);
  const demandaProyectada7d = Math.round(
    demandaPredicha.slice(0, DIAS_PROYECCION_CORTA).reduce((s, v) => s + v, 0),
  );
  const estado = clasificarEstado(existenciaActual, puntoReorden);
  const cantidad = cantidadSugerida({
    estado,
    puntoReorden,
    demandaProyectada7d,
    existenciaActual,
  });

  return {
    sku: producto.sku,
    nombre: producto.nombre,
    existenciaActual,
    nivelServicio,
    leadTimeDias,
    z,
    sigma,
    mediaDiaria,
    demandaProyectada7d,
    stockSeguridad,
    puntoReorden,
    estado,
    cantidadSugerida: cantidad,
    accionSugerida: accionSugerida(estado, cantidad),
  };
}

/** Orden de presentación: críticos primero; dentro de cada estado, menor cobertura primero. */
export function ordenarRecomendaciones(filas) {
  const cobertura = (f) => (f.puntoReorden > 0 ? f.existenciaActual / f.puntoReorden : Infinity);
  return [...filas].sort(
    (a, b) =>
      PRIORIDAD_ESTADO[a.estado] - PRIORIDAD_ESTADO[b.estado] || cobertura(a) - cobertura(b),
  );
}
