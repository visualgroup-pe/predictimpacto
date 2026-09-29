import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Los filtros viven en la URL (?sku=&desde=&hasta=&granularidad=&horizonte=) para
 * que cada vista sea reproducible y enlazable.
 */
export function useFiltros() {
  const [params, setParams] = useSearchParams();

  const filtros = useMemo(
    () => ({
      sku: params.get('sku') || 'TODOS',
      desde: params.get('desde') || '',
      hasta: params.get('hasta') || '',
      granularidad: params.get('granularidad') || 'semanal',
      horizonte: params.get('horizonte') || '90',
    }),
    [params],
  );

  const actualizar = useCallback(
    (cambios) => {
      setParams(
        (actual) => {
          const siguiente = new URLSearchParams(actual);
          Object.entries(cambios).forEach(([k, v]) => {
            if (v === '' || v === undefined || v === null) siguiente.delete(k);
            else siguiente.set(k, v);
          });
          return siguiente;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const limpiar = useCallback(() => setParams({}, { replace: true }), [setParams]);

  return { filtros, actualizar, limpiar };
}
