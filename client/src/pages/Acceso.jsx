import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Acceso() {
  const { usuario, entrar } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={location.state?.desde || '/historica'} replace />;

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await entrar(form.usuario.trim(), form.password);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <main className="acceso">
      <form className="acceso-tarjeta" onSubmit={enviar} noValidate>
        <div className="acceso-marca">
          <Logo tamano={64} />
          <h1>PredictImpacto</h1>
          <p>Sistema de apoyo a decisiones para planificación de inventario</p>
          <p className="acceso-cliente">Cafetería Online Impacto · Lima</p>
        </div>

        <label className="campo">
          <span>Usuario</span>
          <input
            name="usuario"
            autoComplete="username"
            value={form.usuario}
            onChange={(e) => setForm({ ...form, usuario: e.target.value })}
            required
            autoFocus
          />
        </label>
        <label className="campo">
          <span>Contraseña</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </label>

        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="boton-primario"
          disabled={enviando || !form.usuario || !form.password}
        >
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
