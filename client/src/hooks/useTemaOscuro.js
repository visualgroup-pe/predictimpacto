import { useEffect, useState } from 'react';

const consulta = '(prefers-color-scheme: dark)';

export function useTemaOscuro() {
  const [oscuro, setOscuro] = useState(() => window.matchMedia?.(consulta).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(consulta);
    if (!mq) return undefined;
    const alCambiar = (e) => setOscuro(e.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);
  return oscuro;
}
