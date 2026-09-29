export function Cargando({ texto = 'Cargando datos…' }) {
  return (
    <div className="estado-carga" role="status">
      <span className="spinner" aria-hidden="true" />
      {texto}
    </div>
  );
}

export function MensajeError({ error }) {
  return (
    <div className="mensaje-error" role="alert">
      <strong>No se pudieron obtener los datos.</strong> {error?.message}
    </div>
  );
}

export function Vacio({ texto }) {
  return <div className="estado-vacio">{texto}</div>;
}
