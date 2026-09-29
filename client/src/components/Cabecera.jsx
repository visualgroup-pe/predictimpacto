import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Cabecera({ filtrosAbiertos, alternarFiltros }) {
  const { usuario, salir } = useAuth();
  return (
    <header className="cabecera">
      <button
        type="button"
        className="boton-icono"
        onClick={alternarFiltros}
        aria-expanded={filtrosAbiertos}
        aria-controls="panel-filtros"
        title={filtrosAbiertos ? 'Ocultar filtros' : 'Mostrar filtros'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 6h16M7 12h10M10 18h4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span className="solo-lectores">Filtros</span>
      </button>
      <div className="marca">
        <Logo tamano={34} />
        <div>
          <h1>PredictImpacto</h1>
          <p>Sistema de apoyo a decisiones para planificación de inventario</p>
        </div>
      </div>
      <div className="cabecera-usuario">
        <span className="usuario" title="Usuario conectado">
          {usuario}
        </span>
        <button type="button" className="boton-secundario" onClick={salir}>
          Salir
        </button>
      </div>
    </header>
  );
}
