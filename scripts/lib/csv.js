import { existsSync, readFileSync } from 'node:fs';

/** Lector CSV mínimo (separador coma o punto y coma, comillas dobles opcionales). */
export function leerCsv(ruta) {
  if (!existsSync(ruta)) return null;
  const texto = readFileSync(ruta, 'utf8').replace(/^\uFEFF/, '');
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lineas.length === 0) return [];
  const sep = lineas[0].includes(';') && !lineas[0].includes(',') ? ';' : ',';
  const partir = (linea) => {
    const campos = [];
    let actual = '';
    let comillas = false;
    for (let i = 0; i < linea.length; i += 1) {
      const c = linea[i];
      if (c === '"') {
        if (comillas && linea[i + 1] === '"') {
          actual += '"';
          i += 1;
        } else comillas = !comillas;
      } else if (c === sep && !comillas) {
        campos.push(actual.trim());
        actual = '';
      } else actual += c;
    }
    campos.push(actual.trim());
    return campos;
  };
  const cabecera = partir(lineas[0]);
  return lineas.slice(1).map((l) => {
    const campos = partir(l);
    return Object.fromEntries(cabecera.map((c, i) => [c, campos[i]]));
  });
}
