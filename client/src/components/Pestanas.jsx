import { NavLink, useLocation } from 'react-router-dom';

export const PESTANAS = [
  { ruta: 'historica', titulo: 'Demanda Histórica' },
  { ruta: 'proyeccion', titulo: 'Proyección a 90 Días' },
  { ruta: 'recomendaciones', titulo: 'Recomendaciones de Reposición' },
];

export default function Pestanas() {
  const { search } = useLocation();
  return (
    <nav className="pestanas" aria-label="Paneles">
      {PESTANAS.map((p, i) => (
        <NavLink
          key={p.ruta}
          to={{ pathname: `/${p.ruta}`, search }}
          className={({ isActive }) => `pestana${isActive ? ' activa' : ''}`}
        >
          <span className="pestana-num">{i + 1}</span>
          {p.titulo}
        </NavLink>
      ))}
    </nav>
  );
}
