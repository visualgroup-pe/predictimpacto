import { fechaLarga } from '../utils/formato.js';

export default function PanelFiltros({
  abierto,
  panel,
  productos,
  rango,
  filtros,
  actualizar,
  limpiar,
}) {
  const { sku, desde, hasta, granularidad, horizonte } = filtros;
  const nombreProducto =
    sku === 'TODOS' ? 'Todos los productos' : (productos.find((p) => p.sku === sku)?.nombre ?? sku);
  const hayFiltros = sku !== 'TODOS' || desde || hasta;

  return (
    <aside
      id="panel-filtros"
      className={`panel-filtros${abierto ? '' : ' cerrado'}`}
      aria-hidden={!abierto}
    >
      <h2>Filtros</h2>

      <label className="campo">
        <span>Producto</span>
        <select
          value={sku}
          onChange={(e) => actualizar({ sku: e.target.value === 'TODOS' ? '' : e.target.value })}
        >
          <option value="TODOS">Todos</option>
          {productos.map((p) => (
            <option key={p.sku} value={p.sku}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>

      {panel === 'historica' && (
        <>
          <fieldset className="grupo">
            <legend>Rango de fechas</legend>
            <label className="campo">
              <span>Desde</span>
              <input
                type="date"
                value={desde}
                min={rango?.min}
                max={hasta || rango?.max}
                onChange={(e) => actualizar({ desde: e.target.value })}
              />
            </label>
            <label className="campo">
              <span>Hasta</span>
              <input
                type="date"
                value={hasta}
                min={desde || rango?.min}
                max={rango?.max}
                onChange={(e) => actualizar({ hasta: e.target.value })}
              />
            </label>
            {rango && (
              <p className="ayuda">
                Datos disponibles: {fechaLarga(rango.min)} – {fechaLarga(rango.max)}
              </p>
            )}
          </fieldset>

          <fieldset className="grupo">
            <legend>Granularidad</legend>
            <div className="segmentado" role="radiogroup">
              {['diaria', 'semanal'].map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={granularidad === g}
                  className={granularidad === g ? 'activo' : ''}
                  onClick={() => actualizar({ granularidad: g })}
                >
                  {g === 'diaria' ? 'Diaria' : 'Semanal'}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {panel === 'proyeccion' && (
        <label className="campo">
          <span>Horizonte</span>
          <select value={horizonte} onChange={(e) => actualizar({ horizonte: e.target.value })}>
            {[7, 14, 30, 60, 90].map((h) => (
              <option key={h} value={h}>
                {h} días
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="filtros-activos">
        <h3>Filtros aplicados</h3>
        <ul>
          <li>
            <strong>Producto:</strong> {nombreProducto}
          </li>
          {panel === 'historica' && (
            <li>
              <strong>Periodo:</strong>{' '}
              {desde || hasta
                ? `${desde ? fechaLarga(desde) : 'inicio'} – ${hasta ? fechaLarga(hasta) : 'fin'}`
                : 'Todo el histórico'}
            </li>
          )}
          {panel === 'proyeccion' && (
            <li>
              <strong>Horizonte:</strong> {horizonte} días
            </li>
          )}
        </ul>
        <button
          type="button"
          className="boton-secundario ancho"
          onClick={limpiar}
          disabled={!hayFiltros}
        >
          Limpiar filtros
        </button>
      </div>
    </aside>
  );
}
