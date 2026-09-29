/**
 * Generador determinista de datos sintéticos coherentes con los resultados
 * reportados: estacionalidad semanal (lunes a viernes alto, caída el domingo),
 * estacionalidad anual leve y ruido de Poisson.
 */
import {
  CATALOGO,
  HISTORIA_DESDE,
  HISTORIA_HASTA,
  PREDICCION_DESDE,
  HORIZONTE,
} from './catalogo.js';

const DIA = 86_400_000;
export const fechaUTC = (iso) => new Date(`${iso}T00:00:00.000Z`);

// Perfil semanal indexado por getUTCDay(): 0 = domingo … 6 = sábado.
const PERFIL_SEMANAL = [0.4, 1.15, 1.1, 1.1, 1.12, 1.2, 0.83];
const MEDIA_PERFIL = PERFIL_SEMANAL.reduce((a, b) => a + b, 0) / 7;
export const factorSemanal = (fecha) => PERFIL_SEMANAL[fecha.getUTCDay()] / MEDIA_PERFIL;

/** PRNG mulberry32: reproducible con la misma semilla. */
export function crearAleatorio(semilla) {
  let a = semilla >>> 0;
  const uniforme = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => {
    const u = Math.max(uniforme(), 1e-12);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * uniforme());
  };
  const poisson = (lambda) => {
    if (lambda <= 0) return 0;
    if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normal()));
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k += 1;
      p *= uniforme();
    } while (p > L);
    return k - 1;
  };
  return { uniforme, normal, poisson };
}

/** Estacionalidad anual: verano limeño (ene–mar) sube bebidas frías y baja calientes. */
function factorAnual(fecha, amplitud) {
  const diaDelAno = (fecha - Date.UTC(fecha.getUTCFullYear(), 0, 1)) / DIA;
  // Máximo a mediados de febrero, mínimo a mediados de agosto.
  return 1 + amplitud * Math.cos((2 * Math.PI * (diaDelAno - 45)) / 365);
}

function rangoFechas(desdeIso, dias) {
  const inicio = fechaUTC(desdeIso);
  return Array.from({ length: dias }, (_, i) => new Date(inicio.getTime() + i * DIA));
}

/**
 * Serie diaria de predicciones con total, mínimo y máximo exactos.
 * 1) forma = nivel × perfil semanal × estacionalidad × (1 + ruido)
 * 2) escala y redondeo, recortando a [min, max]
 * 3) fija un día en el mínimo (domingo) y otro en el máximo (viernes)
 * 4) reparte la diferencia de a una unidad hasta cuadrar el total
 */
export function generarPrediccion({ total, min, max, estacional = 0 }, semilla) {
  const rnd = crearAleatorio(semilla);
  const fechas = rangoFechas(PREDICCION_DESDE, HORIZONTE);
  const mediaObjetivo = total / HORIZONTE;
  const forma = fechas.map(
    (f) => factorSemanal(f) * factorAnual(f, estacional) * Math.max(0.2, 1 + 0.18 * rnd.normal()),
  );
  const escala = total / forma.reduce((a, b) => a + b, 0);
  const valores = forma.map((x) => Math.min(max, Math.max(min, Math.round(x * escala))));

  const domingos = fechas.map((f, i) => (f.getUTCDay() === 0 ? i : -1)).filter((i) => i >= 0);
  const viernes = fechas.map((f, i) => (f.getUTCDay() === 5 ? i : -1)).filter((i) => i >= 0);
  const iMin = domingos[Math.floor(rnd.uniforme() * domingos.length)];
  const iMax = viernes[Math.floor(rnd.uniforme() * viernes.length)];
  valores[iMin] = min;
  valores[iMax] = max;
  const fijos = new Set([iMin, iMax]);

  // Cuadre del total: suma/resta donde la desviación respecto de la forma ideal es mayor.
  let diferencia = total - valores.reduce((a, b) => a + b, 0);
  let guardia = 100_000;
  while (diferencia !== 0 && guardia > 0) {
    guardia -= 1;
    const paso = Math.sign(diferencia);
    let mejor = -1;
    let mejorResiduo = -Infinity;
    for (let i = 0; i < valores.length; i += 1) {
      if (fijos.has(i)) continue;
      const nuevo = valores[i] + paso;
      // Se conservan exactos el mínimo y el máximo: no se reproducen en otros días
      // salvo que la escala lo exija, y nunca se sobrepasan.
      if (nuevo < min || nuevo > max) continue;
      const residuo = paso * (forma[i] * escala - valores[i]);
      if (residuo > mejorResiduo) {
        mejorResiduo = residuo;
        mejor = i;
      }
    }
    if (mejor < 0) throw new Error(`No se puede cuadrar el total ${total} en [${min}, ${max}]`);
    valores[mejor] += paso;
    diferencia -= paso;
  }

  return fechas.map((fecha, i) => ({ fecha, valor: valores[i], mediaObjetivo }));
}

/**
 * Historia de ventas diaria entre HISTORIA_DESDE y HISTORIA_HASTA. El nivel
 * crece de forma leve hasta converger con la demanda media proyectada.
 */
export function generarVentas({ total, estacional = 0, max }, semilla) {
  const rnd = crearAleatorio(semilla);
  const inicio = fechaUTC(HISTORIA_DESDE);
  const dias = (fechaUTC(HISTORIA_HASTA) - inicio) / DIA + 1;
  const fechas = rangoFechas(HISTORIA_DESDE, dias);
  const mediaProyectada = total / HORIZONTE;
  const tope = Math.max(max * 1.6, max + 4);

  return fechas.map((fecha, i) => {
    const tendencia = 0.78 + 0.22 * (i / (dias - 1)); // crecimiento del negocio
    const lambda =
      mediaProyectada *
      tendencia *
      factorSemanal(fecha) *
      factorAnual(fecha, estacional) *
      Math.max(0.3, 1 + 0.12 * rnd.normal());
    return { fecha, unidades: Math.min(Math.round(tope), rnd.poisson(lambda)) };
  });
}

export function resumen(serie) {
  const v = serie.map((p) => p.valor);
  const total = v.reduce((a, b) => a + b, 0);
  return {
    total,
    promedio: Math.round((total / v.length) * 1000) / 1000,
    min: Math.min(...v),
    max: Math.max(...v),
  };
}

export { CATALOGO };
