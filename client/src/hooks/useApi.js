import { useEffect, useState } from 'react';

/** Ejecuta una lectura de la API y re-ejecuta cuando cambian las dependencias. */
export function useApi(fn, deps) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: true });

  useEffect(() => {
    const ctrl = new AbortController();
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    fn({ signal: ctrl.signal })
      .then((datos) => setEstado({ datos, error: null, cargando: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setEstado({ datos: null, error, cargando: false });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return estado;
}
