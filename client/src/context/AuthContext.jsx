import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, registrarExpiracion, sesion } from '../api/cliente.js';

const AuthContext = createContext(null);

function leerUsuario(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const token = sesion.obtener();
    return token ? leerUsuario(token) : null;
  });

  const salir = useCallback(() => {
    sesion.borrar();
    setUsuario(null);
  }, []);

  useEffect(() => registrarExpiracion(salir), [salir]);

  const entrar = useCallback(async (nombre, password) => {
    const { token, usuario: u } = await api.login(nombre, password);
    sesion.guardar(token);
    setUsuario(u);
  }, []);

  const valor = useMemo(() => ({ usuario, entrar, salir }), [usuario, entrar, salir]);
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
