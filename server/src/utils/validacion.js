import { Producto } from '../models/index.js';
import { solicitudInvalida } from './errores.js';

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const SKU = /^[A-Z0-9-]{2,20}$/;
export const TODOS = 'TODOS';

/** Convierte 'YYYY-MM-DD' en Date UTC a medianoche, validando que la fecha exista. */
export function parsearFecha(valor, nombre) {
  if (valor === undefined || valor === '') return undefined;
  if (typeof valor !== 'string' || !FECHA_ISO.test(valor)) {
    throw solicitudInvalida(`El parámetro '${nombre}' debe tener el formato AAAA-MM-DD.`);
  }
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
    throw solicitudInvalida(`El parámetro '${nombre}' no es una fecha válida: ${valor}.`);
  }
  return fecha;
}

export function parsearRango(query) {
  const desde = parsearFecha(query.desde, 'desde');
  const hasta = parsearFecha(query.hasta, 'hasta');
  if (desde && hasta && desde > hasta) {
    throw solicitudInvalida("El parámetro 'desde' no puede ser posterior a 'hasta'.");
  }
  return { desde, hasta };
}

export function parsearEnum(valor, nombre, permitidos, porDefecto) {
  if (valor === undefined || valor === '') return porDefecto;
  if (!permitidos.includes(valor)) {
    throw solicitudInvalida(
      `El parámetro '${nombre}' debe ser uno de: ${permitidos.join(', ')}. Recibido: '${valor}'.`,
    );
  }
  return valor;
}

export function parsearEntero(valor, nombre, { min, max, porDefecto }) {
  if (valor === undefined || valor === '') return porDefecto;
  const n = Number(valor);
  if (typeof valor !== 'string' || !/^\d+$/.test(valor) || n < min || n > max) {
    throw solicitudInvalida(
      `El parámetro '${nombre}' debe ser un entero entre ${min} y ${max}. Recibido: '${valor}'.`,
    );
  }
  return n;
}

/**
 * Valida el parámetro sku. Devuelve undefined para "todos los productos".
 * Comprueba contra la colección productos que el SKU exista.
 */
export async function parsearSku(valor) {
  if (valor === undefined || valor === '') return undefined;
  if (typeof valor !== 'string') {
    throw solicitudInvalida("El parámetro 'sku' debe indicarse una sola vez.");
  }
  const sku = valor.trim().toUpperCase();
  if (sku === TODOS) return undefined;
  if (!SKU.test(sku)) {
    throw solicitudInvalida(`El parámetro 'sku' tiene un formato inválido: '${valor}'.`);
  }
  if (!(await Producto.exists({ sku }))) {
    throw solicitudInvalida(`El producto con SKU '${sku}' no existe.`);
  }
  return sku;
}
