import {
  cuantilNormal,
  media,
  desviacionEstandar,
  clasificarEstado,
  cantidadSugerida,
  accionSugerida,
  calcularRecomendacion,
  ordenarRecomendaciones,
} from '../src/services/reposicion.js';

describe('cuantilNormal', () => {
  test.each([
    [0.5, 0],
    [0.8, 0.841621],
    [0.9, 1.281552],
    [0.95, 1.644854],
    [0.975, 1.959964],
    [0.99, 2.326348],
    [0.01, -2.326348],
  ])('z(%p) ≈ %p', (p, esperado) => {
    expect(cuantilNormal(p)).toBeCloseTo(esperado, 5);
  });

  test.each([0, 1, -0.1, 1.2, NaN])('rechaza nivel de servicio %p', (p) => {
    expect(() => cuantilNormal(p)).toThrow(RangeError);
  });
});

describe('estadísticos', () => {
  test('media y desviación estándar muestral', () => {
    const v = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(media(v)).toBe(5);
    // Σ(x−μ)² = 32 → s = √(32/7)
    expect(desviacionEstandar(v)).toBeCloseTo(Math.sqrt(32 / 7), 10);
  });

  test('casos degenerados', () => {
    expect(media([])).toBe(0);
    expect(desviacionEstandar([3])).toBe(0);
    expect(desviacionEstandar([4, 4, 4])).toBe(0);
  });
});

describe('clasificarEstado', () => {
  test('crítico cuando la existencia es igual o menor al punto de reorden', () => {
    expect(clasificarEstado(40, 40)).toBe('critico');
    expect(clasificarEstado(10, 40)).toBe('critico');
  });
  test('moderado hasta 1.25 × punto de reorden (inclusive)', () => {
    expect(clasificarEstado(41, 40)).toBe('moderado');
    expect(clasificarEstado(50, 40)).toBe('moderado');
  });
  test('estable por encima de 1.25 × punto de reorden', () => {
    expect(clasificarEstado(51, 40)).toBe('estable');
  });
});

describe('acción sugerida', () => {
  test('cantidad = ⌈ROP + demanda7d − existencia⌉', () => {
    expect(
      cantidadSugerida({
        estado: 'critico',
        puntoReorden: 30,
        demandaProyectada7d: 88,
        existenciaActual: 20,
      }),
    ).toBe(98);
    expect(accionSugerida('critico', 98)).toBe('Producir lote extra de 98 uds.');
  });
  test('estable no sugiere producción', () => {
    expect(
      cantidadSugerida({
        estado: 'estable',
        puntoReorden: 10,
        demandaProyectada7d: 5,
        existenciaActual: 100,
      }),
    ).toBe(0);
    expect(accionSugerida('estable', 0)).toBe('Mantener producción actual');
  });
});

describe('calcularRecomendacion', () => {
  // Serie de 10 días: media = 5, Σ(x−μ)² = 32 → σ = √(32/9) = 1.885618
  const serie = [3, 7, 3, 7, 3, 7, 3, 7, 5, 5];
  const producto = {
    sku: 'CAF-001',
    nombre: 'CAFÉ',
    nivelServicio: 0.95,
    leadTimeDias: 2,
    existenciaActual: 12,
  };

  test('aplica exactamente las fórmulas de la metodología', () => {
    const r = calcularRecomendacion(producto, serie);
    const sigma = Math.sqrt(32 / 9);
    const ssRaw = 1.644854 * sigma * Math.SQRT2; // 4.3863…
    expect(r.sigma).toBeCloseTo(sigma, 10);
    expect(r.z).toBeCloseTo(1.644854, 5);
    expect(r.mediaDiaria).toBe(5);
    expect(r.stockSeguridad).toBe(Math.ceil(ssRaw)); // 5
    expect(r.puntoReorden).toBe(Math.ceil(5 * 2 + 5)); // 15
    expect(r.demandaProyectada7d).toBe(33); // 3+7+3+7+3+7+3
    expect(r.estado).toBe('critico'); // 12 ≤ 15
    expect(r.cantidadSugerida).toBe(15 + 33 - 12);
    expect(r.accionSugerida).toBe('Producir lote extra de 36 uds.');
  });

  test('estado moderado y estable según la existencia', () => {
    expect(calcularRecomendacion({ ...producto, existenciaActual: 18 }, serie).estado).toBe(
      'moderado',
    ); // 15 < 18 ≤ 18.75
    expect(calcularRecomendacion({ ...producto, existenciaActual: 19 }, serie).estado).toBe(
      'estable',
    );
  });

  test('el stock de seguridad nunca es negativo', () => {
    const r = calcularRecomendacion({ ...producto, nivelServicio: 0.3 }, serie);
    expect(r.stockSeguridad).toBe(0);
    expect(r.puntoReorden).toBe(10);
  });

  test('crece con el lead time según √L', () => {
    const l1 = calcularRecomendacion({ ...producto, leadTimeDias: 1 }, serie);
    const l4 = calcularRecomendacion({ ...producto, leadTimeDias: 4 }, serie);
    expect(l4.stockSeguridad).toBeGreaterThanOrEqual(2 * l1.stockSeguridad - 1);
  });
});

describe('ordenarRecomendaciones', () => {
  test('críticos primero y, dentro del estado, menor cobertura primero', () => {
    const filas = [
      { sku: 'A', estado: 'estable', existenciaActual: 100, puntoReorden: 10 },
      { sku: 'B', estado: 'critico', existenciaActual: 9, puntoReorden: 10 },
      { sku: 'C', estado: 'moderado', existenciaActual: 11, puntoReorden: 10 },
      { sku: 'D', estado: 'critico', existenciaActual: 2, puntoReorden: 10 },
    ];
    expect(ordenarRecomendaciones(filas).map((f) => f.sku)).toEqual(['D', 'B', 'C', 'A']);
  });
});
