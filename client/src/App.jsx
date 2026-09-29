import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Acceso from './pages/Acceso.jsx';
import Tablero from './pages/Tablero.jsx';
import DemandaHistorica from './pages/DemandaHistorica.jsx';
import Proyeccion from './pages/Proyeccion.jsx';
import Recomendaciones from './pages/Recomendaciones.jsx';

function RequiereSesion({ children }) {
  const { usuario } = useAuth();
  const location = useLocation();
  if (!usuario) {
    return <Navigate to="/acceso" replace state={{ desde: location.pathname + location.search }} />;
  }
  return children;
}

function Inicio() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/historica', search }} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/acceso" element={<Acceso />} />
      <Route
        element={
          <RequiereSesion>
            <Tablero />
          </RequiereSesion>
        }
      >
        <Route index element={<Inicio />} />
        <Route path="historica" element={<DemandaHistorica />} />
        <Route path="proyeccion" element={<Proyeccion />} />
        <Route path="recomendaciones" element={<Recomendaciones />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
