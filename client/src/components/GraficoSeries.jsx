import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fechaLarga, numero } from '../utils/formato.js';
import { useTemaOscuro } from '../hooks/useTemaOscuro.js';

/** Muestra de línea (color + tipo de trazo) usada en leyenda, tooltip y tablas. */
export function Trazo({ estilo }) {
  if (!estilo) return null;
  return (
    <svg className="trazo" width="22" height="10" aria-hidden="true">
      <line
        x1="1"
        y1="5"
        x2="21"
        y2="5"
        stroke={estilo.color}
        strokeWidth="2.5"
        strokeDasharray={estilo.trazo ? '5 3' : undefined}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Leyenda({ skus, estilos, ocultos, alternar }) {
  return (
    <ul className="leyenda" aria-label="Leyenda: pulse un producto para mostrarlo u ocultarlo">
      {skus.map((sku) => {
        const e = estilos[sku];
        const oculto = ocultos.has(sku);
        return (
          <li key={sku}>
            <button
              type="button"
              className={`leyenda-item${oculto ? ' oculto' : ''}`}
              onClick={() => alternar(sku)}
              aria-pressed={!oculto}
            >
              <Trazo estilo={e} />
              {e.nombre}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Contenido({ active, payload, label, estilos, unidad }) {
  if (!active || !payload?.length) return null;
  const filas = [...payload].filter((p) => p.value !== undefined).sort((a, b) => b.value - a.value);
  return (
    <div className="tooltip">
      <div className="tooltip-titulo">{fechaLarga(label)}</div>
      {filas.map((p) => (
        <div key={p.dataKey} className="tooltip-fila">
          <Trazo estilo={estilos[p.dataKey]} />
          <span className="tooltip-nombre">{estilos[p.dataKey].nombre}</span>
          <span className="tooltip-valor">
            {numero(p.value)} {unidad}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Serie temporal multi-producto. Una línea por SKU, color fijo por producto,
 * leyenda interactiva y tooltip con cruz vertical.
 */
export default function GraficoSeries({
  datos,
  skus,
  estilos,
  formatoEje,
  unidad = 'uds.',
  alto = 380,
  etiqueta,
}) {
  const oscuro = useTemaOscuro();
  const [ocultos, setOcultos] = useState(new Set());
  const alternar = (sku) =>
    setOcultos((prev) => {
      const s = new Set(prev);
      if (s.has(sku)) s.delete(sku);
      else s.add(sku);
      return s;
    });

  const tinta = oscuro ? '#c3c2b7' : '#52514e';
  const rejilla = oscuro ? '#2f2f2c' : '#e9e8e4';
  const visibles = skus.filter((s) => estilos[s]);

  return (
    <figure className="grafico" aria-label={etiqueta}>
      <Leyenda skus={visibles} estilos={estilos} ocultos={ocultos} alternar={alternar} />
      <ResponsiveContainer width="100%" height={alto}>
        <LineChart data={datos} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={rejilla} vertical={false} />
          <XAxis
            dataKey="fecha"
            tickFormatter={formatoEje}
            tick={{ fill: tinta, fontSize: 12 }}
            axisLine={{ stroke: rejilla }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: tinta, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={44}
            allowDecimals={false}
            label={{
              value: 'Unidades',
              angle: -90,
              position: 'insideLeft',
              fill: tinta,
              fontSize: 12,
              dy: 30,
            }}
          />
          <Tooltip
            content={<Contenido estilos={estilos} unidad={unidad} />}
            cursor={{ stroke: tinta, strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          {visibles.map((sku) => (
            <Line
              key={sku}
              type="monotone"
              dataKey={sku}
              name={estilos[sku].nombre}
              stroke={estilos[sku].color}
              strokeDasharray={estilos[sku].trazo}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: oscuro ? '#1a1a19' : '#fcfcfb' }}
              hide={ocultos.has(sku)}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
