import { useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import GraficoSeries from '../components/GraficoSeries.jsx';
import TarjetaMetrica from '../components/TarjetaMetrica.jsx';
import { Cargando, MensajeError, Vacio } from '../components/Estados.jsx';
import { api } from '../api/cliente.js';
import { useApi } from '../hooks/useApi.js';
import { fechaCorta, fechaLarga, mesAnio, numero } from '../utils/formato.js';

export default function DemandaHistorica() {
  const { filtros, estilos, setRango } = useOutletContext();
  const { sku, desde, hasta, granularidad } = filtros;

  const { datos, error, cargando } = useApi(
    (o) => api.ventas({ sku, desde, hasta, granularidad }, o),
    [sku, desde, hasta, granularidad],
  );

  useEffect(() => {
    if (datos?.rangoDisponible) setRango(datos.rangoDisponible);
  }, [datos, setRango]);

  const totales = useMemo(() => {
    if (!datos?.datos.length) return null;
    const total = datos.datos.reduce((s, d) => s + d.total, 0);
    // Rango real cubierto (en semanal, la etiqueta de cada semana es su lunes).
    const min = datos.rangoDisponible?.min ?? datos.datos[0].fecha;
    const max = datos.rangoDisponible?.max ?? datos.datos.at(-1).fecha;
    const inicio = datos.desde && datos.desde > min ? datos.desde : min;
    const fin = datos.hasta && datos.hasta < max ? datos.hasta : max;
    return {
      total,
      periodos: datos.datos.length,
      promedio: total / datos.datos.length,
      inicio,
      fin,
    };
  }, [datos]);

  const largo = (datos?.datos.length ?? 0) > 120 || granularidad === 'semanal';

  return (
    <section className="panel" aria-labelledby="titulo-historica">
      <div className="panel-encabezado">
        <div>
          <h2 id="titulo-historica">Demanda Histórica</h2>
          <p className="panel-descripcion">
            Unidades vendidas por producto (
            {granularidad === 'semanal'
              ? 'total semanal, semanas de lunes a domingo'
              : 'total diario'}
            ). Agregación calculada en MongoDB por la API.
          </p>
        </div>
      </div>

      {cargando && <Cargando />}
      {error && <MensajeError error={error} />}
      {datos && !cargando && datos.datos.length === 0 && (
        <Vacio texto="No hay ventas en el rango seleccionado." />
      )}
      {datos && !cargando && datos.datos.length > 0 && (
        <>
          <div className="fila-tarjetas">
            <TarjetaMetrica etiqueta="Unidades vendidas" valor={numero(totales.total)} />
            <TarjetaMetrica
              etiqueta={granularidad === 'semanal' ? 'Promedio semanal' : 'Promedio diario'}
              valor={numero(totales.promedio, 1)}
              detalle="uds. por periodo"
            />
            <TarjetaMetrica
              etiqueta="Periodo"
              valor={`${numero(totales.periodos)} ${granularidad === 'semanal' ? 'semanas' : 'días'}`}
              detalle={`${fechaLarga(totales.inicio)} – ${fechaLarga(totales.fin)}`}
            />
            <TarjetaMetrica etiqueta="Productos" valor={datos.skus.length} />
          </div>
          <div className="tarjeta">
            <GraficoSeries
              datos={datos.datos}
              skus={datos.skus}
              estilos={estilos}
              formatoEje={largo ? mesAnio : fechaCorta}
              etiqueta="Serie temporal de unidades vendidas por producto"
            />
          </div>
        </>
      )}
    </section>
  );
}
