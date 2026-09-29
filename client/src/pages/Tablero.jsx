import { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Cabecera from '../components/Cabecera.jsx';
import PanelFiltros from '../components/PanelFiltros.jsx';
import Pestanas from '../components/Pestanas.jsx';
import { Cargando, MensajeError } from '../components/Estados.jsx';
import { api } from '../api/cliente.js';
import { useApi } from '../hooks/useApi.js';
import { useFiltros } from '../hooks/useFiltros.js';
import { useTemaOscuro } from '../hooks/useTemaOscuro.js';
import { mapaEstilos } from '../utils/colores.js';

export default function Tablero() {
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(() => window.innerWidth > 900);
  const { pathname } = useLocation();
  const panel = pathname.split('/')[1] || 'historica';
  const { filtros, actualizar, limpiar } = useFiltros();
  const oscuro = useTemaOscuro();

  const productos = useApi((o) => api.productos(o), []);
  const lista = useMemo(() => productos.datos?.datos ?? [], [productos.datos]);
  const estilos = useMemo(() => mapaEstilos(lista, oscuro), [lista, oscuro]);
  const [rango, setRango] = useState(null);

  return (
    <div className="tablero">
      <Cabecera
        filtrosAbiertos={filtrosAbiertos}
        alternarFiltros={() => setFiltrosAbiertos((v) => !v)}
      />
      <div className={`cuerpo${filtrosAbiertos ? ' con-filtros' : ''}`}>
        <PanelFiltros
          abierto={filtrosAbiertos}
          panel={panel}
          productos={lista}
          rango={rango}
          filtros={filtros}
          actualizar={actualizar}
          limpiar={limpiar}
        />
        <main className="contenido">
          <Pestanas />
          {productos.cargando && <Cargando />}
          {productos.error && <MensajeError error={productos.error} />}
          {productos.datos && <Outlet context={{ filtros, productos: lista, estilos, setRango }} />}
        </main>
      </div>
    </div>
  );
}
