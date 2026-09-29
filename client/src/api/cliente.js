/**
 * Cliente HTTP de la API REST. Es la única vía de acceso a datos del front.
 */
const BASE = '/api/v1';
const CLAVE_TOKEN = 'predictimpacto.token';

export const sesion = {
  obtener: () => {
    try {
      return localStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null;
    }
  },
  guardar: (token) => {
    try {
      localStorage.setItem(CLAVE_TOKEN, token);
    } catch {
      /* almacenamiento no disponible */
    }
  },
  borrar: () => {
    try {
      localStorage.removeItem(CLAVE_TOKEN);
    } catch {
      /* almacenamiento no disponible */
    }
  },
};

export class ErrorApi extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

let alExpirar = () => {};
export const registrarExpiracion = (fn) => {
  alExpirar = fn;
};

async function solicitar(ruta, { metodo = 'GET', cuerpo, params, signal } = {}) {
  const url = new URL(`${BASE}${ruta}`, window.location.origin);
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const token = sesion.obtener();
  const res = await fetch(url, {
    method: metodo,
    signal,
    headers: {
      ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && ruta !== '/auth/login') alExpirar();
    throw new ErrorApi(res.status, datos.error || `Error ${res.status}`);
  }
  return datos;
}

export const api = {
  login: (usuario, password) =>
    solicitar('/auth/login', { metodo: 'POST', cuerpo: { usuario, password } }),
  productos: (opts) => solicitar('/productos', opts),
  ventas: (params, opts) => solicitar('/ventas', { ...opts, params }),
  predicciones: (params, opts) => solicitar('/predicciones', { ...opts, params }),
  metricas: (opts) => solicitar('/metricas', opts),
  recomendaciones: (params, opts) => solicitar('/recomendaciones', { ...opts, params }),
};
