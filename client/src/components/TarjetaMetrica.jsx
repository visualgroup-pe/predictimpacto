export default function TarjetaMetrica({ etiqueta, valor, detalle, destacado }) {
  return (
    <div className={`tarjeta-metrica${destacado ? ' destacada' : ''}`}>
      <span className="tarjeta-etiqueta">{etiqueta}</span>
      <span className="tarjeta-valor">{valor}</span>
      {detalle && <span className="tarjeta-detalle">{detalle}</span>}
    </div>
  );
}
