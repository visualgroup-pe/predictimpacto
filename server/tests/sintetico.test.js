import {
  CATALOGO,
  generarPrediccion,
  generarVentas,
  resumen,
} from '../../scripts/lib/sintetico.js';

// Valores reportados en el artículo: total · promedio diario · mín · máx (90 días).
const REPORTADO = {
  'IMP-001': [1128, 12.533, 1, 25],
  'IMP-002': [438, 4.867, 0, 7],
  'IMP-003': [311, 3.456, 0, 5],
  'IMP-004': [253, 2.811, 0, 5],
  'IMP-005': [208, 2.311, 0, 5],
  'IMP-006': [175, 1.944, 0, 3],
  'IMP-007': [175, 1.944, 0, 4],
  'IMP-008': [158, 1.756, 0, 3],
  'IMP-009': [129, 1.433, 0, 3],
  'IMP-010': [101, 1.122, 0, 3],
};

describe('datos sintéticos de siembra', () => {
  test.each(CATALOGO.map((p, i) => [p.nombre, p, i]))(
    'la proyección de %s coincide con lo reportado',
    (_nombre, producto, i) => {
      const serie = generarPrediccion(producto, 1000 + i);
      const [total, promedio, min, max] = REPORTADO[producto.sku];
      expect(serie).toHaveLength(90);
      expect(resumen(serie)).toEqual({ total, promedio, min, max });
      expect(serie[0].fecha.toISOString().slice(0, 10)).toBe('2026-04-27');
    },
  );

  test('es determinista', () => {
    expect(generarPrediccion(CATALOGO[0], 7)).toEqual(generarPrediccion(CATALOGO[0], 7));
  });

  test('ventas entre 2024-01-03 y 2026-04-26 con caída el domingo', () => {
    const ventas = generarVentas(CATALOGO[0], 2000);
    expect(ventas[0].fecha.toISOString().slice(0, 10)).toBe('2024-01-03');
    expect(ventas.at(-1).fecha.toISOString().slice(0, 10)).toBe('2026-04-26');
    const porDia = Array(7).fill(0);
    for (const v of ventas) porDia[v.fecha.getUTCDay()] += v.unidades;
    const laborable = Math.min(...porDia.slice(1, 6));
    expect(porDia[0]).toBeLessThan(laborable * 0.5);
  });
});
