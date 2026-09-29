const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];

const partes = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return { a, m, d };
};

export const fechaCorta = (iso) => {
  const { m, d } = partes(iso);
  return `${d} ${MESES[m - 1]}`;
};

export const mesAnio = (iso) => {
  const { a, m } = partes(iso);
  return `${MESES[m - 1]} ${String(a).slice(2)}`;
};

export const fechaLarga = (iso) => {
  const { a, m, d } = partes(iso);
  return `${d} ${MESES[m - 1]} ${a}`;
};

const nf = (dec) =>
  new Intl.NumberFormat('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
export const numero = (v, dec = 0) => (v === null || v === undefined ? '—' : nf(dec).format(v));
