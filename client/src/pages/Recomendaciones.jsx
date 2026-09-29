import { useOutletContext } from 'react-router-dom';
import InsigniaEstado from '../components/InsigniaEstado.jsx';
import TarjetaMetrica from '../components/TarjetaMetrica.jsx';
import { Cargando, MensajeError } from '../components/Estados.jsx';
import { api } from '../api/cliente.js';
import { useApi } from '../hooks/useApi.js';
import { fechaLarga, numero } from '../utils/formato.js';

export default function Recomendaciones() {
  const { filtros } = useOutletContext();
  const { sku } = filtros;
  const { datos, error, cargando } = useApi((o) => api.recomendaciones({ sku }, o), [sku]);

  return (
    <section className="panel" aria-labelledby="titulo-recomendaciones">
      <div className="panel-encabezado">
        <div>
          <h2 id="titulo-recomendaciones">Recomendaciones de Reposición</h2>
          <p className="panel-descripcion">
            Resultado del motor de reposición sobre la proyección de 90 días
            {datos?.datos[0] && ` · fecha de decisión ${fechaLarga(datos.datos[0].fecha)}`}.
            Ordenado por prioridad: críticos primero.
          </p>
        </div>
      </div>

      {cargando && <Cargando texto="Ejecutando el motor de reposición…" />}
      {error && <MensajeError error={error} />}
      {datos && !cargando && (
        <>
          <div className="fila-tarjetas">
            <TarjetaMetrica
              etiqueta="Críticos"
              valor={datos.resumen.critico}
              detalle="Existencia ≤ punto de reorden"
            />
            <TarjetaMetrica
              etiqueta="Moderados"
              valor={datos.resumen.moderado}
              detalle="Hasta 1.25 × punto de reorden"
            />
            <TarjetaMetrica
              etiqueta="Estables"
              valor={datos.resumen.estable}
              detalle="Sobre 1.25 × punto de reorden"
            />
          </div>

          <div className="tarjeta tabla-desplazable">
            <table className="tabla tabla-recomendaciones">
              <thead>
                <tr>
                  <th scope="col">Producto</th>
                  <th scope="col" className="num">
                    Existencia actual
                  </th>
                  <th scope="col" className="num">
                    Demanda proyectada (próx. 7 días)
                  </th>
                  <th scope="col" className="num">
                    Stock de seguridad
                  </th>
                  <th scope="col" className="num">
                    Punto de reorden
                  </th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acción sugerida</th>
                </tr>
              </thead>
              <tbody>
                {datos.datos.map((r) => (
                  <tr key={r.sku} className={`fila-${r.estado}`}>
                    <th scope="row">
                      <span className="producto-nombre">{r.nombre}</span>
                      <span className="producto-meta">
                        {r.sku} · NS {numero(r.nivelServicio * 100)}% · LT {r.leadTimeDias} d
                      </span>
                    </th>
                    <td className="num">{numero(r.existenciaActual)}</td>
                    <td className="num">{numero(r.demandaProyectada7d)}</td>
                    <td className="num">{numero(r.stockSeguridad)}</td>
                    <td className="num">{numero(r.puntoReorden)}</td>
                    <td>
                      <InsigniaEstado estado={r.estado} />
                    </td>
                    <td className="accion">{r.accionSugerida}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="tarjeta metodologia">
            <summary>Metodología del cálculo</summary>
            <ul>
              <li>
                σ = desviación estándar muestral de la demanda predicha diaria en el horizonte de 90
                días.
              </li>
              <li>
                z = cuantil de la normal estándar para el nivel de servicio (NS) del producto.
              </li>
              <li>Stock de seguridad = ⌈z × σ × √(lead time)⌉.</li>
              <li>
                Punto de reorden = ⌈demanda media diaria predicha × lead time + stock de seguridad⌉.
              </li>
              <li>
                Crítico si existencia ≤ punto de reorden; moderado si existencia ≤ 1.25 × punto de
                reorden; estable en otro caso.
              </li>
              <li>
                Cantidad sugerida = ⌈punto de reorden + demanda de los próximos 7 días −
                existencia⌉.
              </li>
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
