/**
 * Paleta categórica validada (orden fijo; el color sigue al producto, no a su rango).
 * Más de 8 series: los slots 9 y 10 reutilizan los tonos 1 y 2 con trazo
 * discontinuo, de modo que la identidad nunca depende solo del color.
 */
const CLARO = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#4a3aa7',
  '#e34948',
];
const OSCURO = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
];

export function estiloSerie(indice, oscuro) {
  const paleta = oscuro ? OSCURO : CLARO;
  return {
    color: paleta[indice % paleta.length],
    trazo: indice >= paleta.length ? '6 4' : undefined,
  };
}

/** Asigna estilo por SKU según el orden estable del catálogo (ordenado por SKU). */
export function mapaEstilos(productos, oscuro) {
  return Object.fromEntries(
    productos.map((p, i) => [p.sku, { ...estiloSerie(i, oscuro), nombre: p.nombre }]),
  );
}
