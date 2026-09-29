import { useOutletContext } from 'react-router-dom';
import GraficoSeries, { Trazo } from '../components/GraficoSeries.jsx';
import TarjetaMetrica from '../components/TarjetaMetrica.jsx';
import { Cargando, MensajeError } from '../components/Estados.jsx';
import { api } from '../api/cliente.js';
import { useApi } from '../hooks/useApi.js';
import { fechaCorta, fechaLarga, numero } from '../utils/formato.js';

export default function Proyeccion() {
  const { filtros, estilos } = useOutletContext();
  const { sku, horizonte } = filtros;

  const metricas = useApi((o) => api.metricas(o), []);
  const pred = useApi((o) => api.predicciones({ sku, horizonte }, o), [sku, horizonte]);
  const m = metricas.datos?.metricas;

  return (
    <section className="panel" aria-labelledby="titulo-proyeccion">
      <div className="panel-encabezado">
        <div>
          <h2 id="titulo-proyeccion">Proyección a {horizonte} Días</h2>
          <p className="panel-descripcion">
            Demanda diaria proyectada por el modelo seleccionado
            {pred.datos?.desde &&
              ` · ${fechaLarga(pred.datos.desde)} – ${fechaLarga(pred.datos.hasta)}`}
            {pred.datos?.modeloVersion && ` · versión ${pred.datos.modeloVersion}`}
          </p>
        </div>
      </div>

      {metricas.error && <MensajeError error={metricas.error} />}
      {m && (
        <div className="fila-tarjetas">
          <TarjetaMetrica etiqueta="MAE" valor={numero(m.mae, 4)} detalle="Error absoluto medio" />
          <TarjetaMetrica
            etiqueta="RMSE"
            valor={numero(m.rmse, 4)}
            detalle="Raíz del error cuadrático medio"
          />
          <TarjetaMetrica
            etiqueta="R²"
            valor={numero(m.r2, 4)}
            detalle="Coeficiente de determinación"
          />
          <TarjetaMetrica
            etiqueta="Modelo"
            valor={metricas.datos.modeloSeleccionado}
            detalle={metricas.datos.criterioSeleccion}
            destacado
          />
        </div>
      )}

      {pred.cargando && <Cargando />}
      {pred.error && <MensajeError error={pred.error} />}
      {pred.datos && !pred.cargando && (
        <div className="tarjeta">
          <GraficoSeries
            datos={pred.datos.datos}
            skus={pred.datos.resumen.map((r) => r.sku)}
            estilos={estilos}
            formatoEje={fechaCorta}
            unidad="uds. proyectadas"
            etiqueta="Curva de demanda proyectada por producto"
          />
        </div>
      )}

      <div className="rejilla-tablas">
        {metricas.datos && (
          <div className="tarjeta">
            <h3>Comparativa de modelos evaluados</h3>
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Modelo</th>
                  <th scope="col" className="num">
                    MAE
                  </th>
                  <th scope="col" className="num">
                    RMSE
                  </th>
                  <th scope="col" className="num">
                    R²
                  </th>
                </tr>
              </thead>
              <tbody>
                {metricas.datos.modelos.map((mod) => {
                  const sel = mod.modelo === metricas.datos.modeloSeleccionado;
                  return (
                    <tr key={mod.modelo} className={sel ? 'fila-seleccionada' : ''}>
                      <th scope="row">
                        {mod.modelo}
                        {sel && <span className="etiqueta-sel">Seleccionado</span>}
                      </th>
                      <td className="num">{numero(mod.mae, 4)}</td>
                      <td className="num">{numero(mod.rmse, 4)}</td>
                      <td className="num">{numero(mod.r2, 4)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="nota">
              Métricas sobre el conjunto de prueba. Menor MAE/RMSE y mayor R² es mejor.
            </p>
          </div>
        )}

        {pred.datos && (
          <div className="tarjeta">
            <h3>Resumen de la proyección ({horizonte} días)</h3>
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Producto</th>
                  <th scope="col" className="num">
                    Total
                  </th>
                  <th scope="col" className="num">
                    Prom. diario
                  </th>
                  <th scope="col" className="num">
                    Mín.
                  </th>
                  <th scope="col" className="num">
                    Máx.
                  </th>
                </tr>
              </thead>
              <tbody>
                {pred.datos.resumen.map((r) => (
                  <tr key={r.sku}>
                    <th scope="row">
                      <Trazo estilo={estilos[r.sku]} />
                      {r.nombre}
                    </th>
                    <td className="num">{numero(r.total)}</td>
                    <td className="num">{numero(r.promedioDiario, 3)}</td>
                    <td className="num">{numero(r.minimo)}</td>
                    <td className="num">{numero(r.maximo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
