# PredictImpacto

**Sistema de apoyo a decisiones para planificación de inventario** — Cafetería Online Impacto (Lima, Perú).

Plataforma web de tres capas que consume las predicciones de demanda diaria de un modelo
Random Forest (entrenado fuera de la plataforma) y recomienda la reposición de inventario
por producto mediante stock de seguridad y punto de reorden.

> La plataforma **no entrena modelos**: solo carga y expone los resultados del modelo.

## Arquitectura

```
┌────────────────────────┐  HTTP/JSON  ┌──────────────────────────┐  Mongoose  ┌───────────────────┐
│ Presentación           │ ──────────► │ Lógica de negocio        │ ─────────► │ Persistencia      │
│ React 18 + Vite (SPA)  │  /api/v1/*  │ Express (API REST)       │            │ MongoDB           │
│ Recharts               │ ◄────────── │ Motor de reposición      │ ◄───────── │ $jsonSchema       │
└────────────────────────┘     JWT     └──────────────────────────┘            └───────────────────┘
```

- El cliente **nunca** accede a MongoDB: toda lectura pasa por la API (`client/src/api/cliente.js`).
- Las agregaciones (diaria/semanal, resúmenes de proyección) se calculan con el _aggregation pipeline_
  de MongoDB en el servidor, no en el navegador.
- Cada colección tiene un validador `$jsonSchema` estricto (`server/src/models/esquemas.js`) que
  rechaza tipos incorrectos y campos obligatorios ausentes, incluso fuera de Mongoose.

```
predictimpacto/
├── client/                 # React + Vite (SPA)
├── server/
│   ├── src/models/         # esquemas Mongoose + validadores $jsonSchema
│   ├── src/routes/         # endpoints REST
│   ├── src/services/       # motor de reposición (reposicion.js) y su ejecución
│   └── tests/              # pruebas unitarias e integración
├── scripts/seed.js         # carga de datos hacia MongoDB
├── data/                   # CSV de entrada (opcionales) y metricas.json
├── docs/capturas/          # capturas del artículo
├── docker-compose.yml      # MongoDB local opcional
└── render.yaml             # despliegue en Render (Blueprint)
```

## Requisitos

- Node.js ≥ 20 (probado con 22) y npm ≥ 10
- MongoDB ≥ 5.0 (se usa `$dateTrunc`). Opciones: instalación local, MongoDB Atlas o
  `docker compose up -d` con el `docker-compose.yml` incluido.

## Instalación

```bash
git clone <url-del-repositorio> predictimpacto
cd predictimpacto
npm install            # instala cliente y servidor (npm workspaces)
cp .env.example .env   # y completa los valores
```

### Variables de entorno (`.env`)

| Variable              | Descripción                                         | Ejemplo                                    |
| --------------------- | --------------------------------------------------- | ------------------------------------------ |
| `MONGODB_URI`         | Cadena de conexión a MongoDB                        | `mongodb://127.0.0.1:27017/predictimpacto` |
| `PORT`                | Puerto de la API                                    | `4000`                                     |
| `JWT_SECRET`          | Secreto para firmar los JWT (largo y aleatorio)     | `openssl rand -hex 32`                     |
| `JWT_EXPIRES_IN`      | Vigencia del token (opcional)                       | `8h`                                       |
| `SEED_ADMIN_USER`     | Usuario que crea `npm run seed` (no hay registro)   | `admin`                                    |
| `SEED_ADMIN_PASSWORD` | Contraseña de ese usuario (se guarda con bcrypt)    | —                                          |
| `METRICAS_PATH`       | Ruta alternativa del archivo de métricas (opcional) | `data/metricas.json`                       |

`.env` está excluido del repositorio. No subas credenciales reales.

## Siembra de datos

```bash
npm run seed
```

El script limpia las colecciones, las recrea con su `$jsonSchema` e índices, carga los datos,
crea el usuario de acceso y ejecuta el motor de reposición una vez (imprime la tabla resultante).

**Con tus datos.** Si colocas alguno de estos archivos en `data/`, se usa en lugar del sintético
correspondiente (separador `,` o `;`, fechas `AAAA-MM-DD`):

| Archivo            | Columnas                                                                            |
| ------------------ | ----------------------------------------------------------------------------------- |
| `productos.csv`    | `sku,nombre,categoria,nivelServicio,leadTimeDias,existenciaActual,existenciaMinima` |
| `ventas.csv`       | `sku,fecha,unidades`                                                                |
| `predicciones.csv` | `sku,fecha,demandaPredicha[,modeloVersion,generadoEn]`                              |

Las métricas de los modelos se leen de `data/metricas.json`.

**Sin CSV (datos sintéticos).** Se generan datos deterministas coherentes con la investigación:

- Predicciones de 90 días (2026-04-27 a 2026-07-25) que cuadran **exactamente** con el total,
  promedio diario, mínimo y máximo reportados por producto (verificado en `server/tests/sintetico.test.js`):

  | SKU     | Producto       | Total | Prom. diario | Mín. | Máx. |
  | ------- | -------------- | ----: | -----------: | ---: | ---: |
  | IMP-001 | CAFÉ           |  1128 |       12.533 |    1 |   25 |
  | IMP-002 | EMPANADA       |   438 |        4.867 |    0 |    7 |
  | IMP-003 | KEKE           |   311 |        3.456 |    0 |    5 |
  | IMP-004 | TARTALETA      |   253 |        2.811 |    0 |    5 |
  | IMP-005 | INFUSIÓN       |   208 |        2.311 |    0 |    5 |
  | IMP-006 | FRAPPÉ MEDIANO |   175 |        1.944 |    0 |    3 |
  | IMP-007 | GASEOSA        |   175 |        1.944 |    0 |    4 |
  | IMP-008 | ENCHILADA      |   158 |        1.756 |    0 |    3 |
  | IMP-009 | HAMBURGUESA    |   129 |        1.433 |    0 |    3 |
  | IMP-010 | GALLETA        |   101 |        1.122 |    0 |    3 |

- Ventas diarias del 2024-01-03 al 2026-04-26 con estacionalidad semanal (lunes a viernes alto,
  caída el domingo), estacionalidad anual leve (verano limeño) y ruido de Poisson.
- Existencias calibradas contra el punto de reorden para obtener 4 productos críticos,
  2 moderados y 4 estables.

## Ejecución

```bash
npm run dev      # API en http://localhost:4000 y cliente en http://localhost:5173 (concurrently)
```

Producción: `npm run build && npm start` (la API sirve también el build del cliente en el puerto `PORT`).
Para publicarla en internet, ver [Despliegue](#despliegue-en-internet-render--mongodb-atlas).

## Pruebas y calidad

```bash
npm test               # Jest: unitarias del motor + integración de la API (Supertest + mongodb-memory-server)
npm run lint           # ESLint
npm run format:check   # Prettier (npm run format para corregir)
```

La primera ejecución de `npm test` descarga un binario de MongoDB para `mongodb-memory-server`.
La GitHub Action `.github/workflows/ci.yml` ejecuta lint, formato, pruebas y build en cada push.

## API REST (`/api/v1`)

Todas las rutas, salvo `auth/login` y `salud`, requieren `Authorization: Bearer <token>`.
Los parámetros inválidos devuelven **400** con `{ "error": "mensaje" }`; sin token válido, **401**.

| Método | Ruta                      | Parámetros                                                                                         | Descripción                                                                                               |
| ------ | ------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/auth/login`      | cuerpo `{ usuario, password }`                                                                     | Devuelve `{ token, usuario }` (JWT)                                                                       |
| GET    | `/api/v1/salud`           | —                                                                                                  | Estado de la API y de la conexión a MongoDB                                                               |
| GET    | `/api/v1/productos`       | —                                                                                                  | Catálogo de productos                                                                                     |
| GET    | `/api/v1/ventas`          | `sku` (o `TODOS`), `desde`, `hasta` (`AAAA-MM-DD`), `granularidad=diaria\|semanal` (def. `diaria`) | Serie agregada en MongoDB; una fila por periodo con una columna por SKU y `total`. Semanas lunes–domingo  |
| GET    | `/api/v1/predicciones`    | `sku`, `horizonte` (entero 1–90, def. 90)                                                          | Serie diaria proyectada y resumen por producto (total, promedio, mín., máx.)                              |
| GET    | `/api/v1/metricas`        | —                                                                                                  | Métricas del modelo seleccionado y tabla comparativa de los cinco modelos                                 |
| GET    | `/api/v1/recomendaciones` | `sku`                                                                                              | Ejecuta el motor de reposición, persiste el resultado y devuelve una fila por producto (críticos primero) |

## Modelo de datos

| Colección         | Campos                                                                                          | Índices              |
| ----------------- | ----------------------------------------------------------------------------------------------- | -------------------- |
| `productos`       | `sku, nombre, categoria, nivelServicio (0–1), leadTimeDias, existenciaActual, existenciaMinima` | `sku` único          |
| `ventas`          | `sku, fecha, unidades`                                                                          | `{sku, fecha}` único |
| `predicciones`    | `sku, fecha, demandaPredicha, modeloVersion, generadoEn`                                        | `{sku, fecha}` único |
| `recomendaciones` | `sku, fecha, demandaProyectada7d, stockSeguridad, puntoReorden, estado, accionSugerida`         | `{sku, fecha}` único |
| `usuarios`        | `usuario, passwordHash` (auxiliar de autenticación, fuera del modelo analítico)                 | `usuario` único      |

## Motor de reposición

Implementado en `server/src/services/reposicion.js` (funciones puras, con pruebas unitarias en
`server/tests/reposicion.test.js`). Para cada producto, sobre el horizonte de 90 días:

| Magnitud                  | Fórmula                                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| σ_pronóstico              | desviación estándar **muestral** (n − 1) de la demanda predicha diaria                                                                                                  |
| z                         | cuantil de la normal estándar del `nivelServicio` (Acklam + refinamiento de Halley)                                                                                     |
| Stock de seguridad (SS)   | ⌈z × σ_pronóstico × √leadTimeDias⌉ (mínimo 0)                                                                                                                           |
| Punto de reorden (ROP)    | ⌈demanda media diaria predicha × leadTimeDias + SS⌉                                                                                                                     |
| Demanda proyectada 7 días | suma de los primeros 7 días del horizonte                                                                                                                               |
| Estado                    | **crítico** si existencia ≤ ROP · **moderado** si existencia ≤ 1.25 × ROP · **estable** en otro caso                                                                    |
| Acción sugerida           | crítico: «Producir lote extra de N uds.» · moderado: «Programar producción de N uds.» · estable: «Mantener producción actual», con N = ⌈ROP + demanda 7 d − existencia⌉ |

El redondeo hacia arriba es un criterio conservador: nunca subestima el inventario requerido.
La fecha de cada recomendación es el primer día del horizonte de predicción (fecha de decisión).

## Despliegue en internet (Render + MongoDB Atlas)

Las tres capas se despliegan intactas: un único servicio web en Render ejecuta la API y sirve el
build del cliente; la persistencia es un clúster de MongoDB Atlas. GitHub Pages no sirve para esto
porque solo aloja archivos estáticos y no puede ejecutar la API.

### 1. MongoDB Atlas (plan gratuito M0)

1. Crea un clúster **M0** en AWS, región **N. Virginia (us-east-1)**: es la misma región del servicio
   de Render y la más cercana a Lima de las disponibles.
2. En **Database Access**, crea un usuario de base de datos con contraseña (rol _Read and write to any
   database_).
3. En **Network Access**, agrega `0.0.0.0/0`: el plan gratuito de Render no tiene IP fija.
4. En **Connect → Drivers**, copia la cadena `mongodb+srv://…` y añade el nombre de la base antes de
   los parámetros, por ejemplo:
   `mongodb+srv://usuario:clave@cluster0.xxxxx.mongodb.net/predictimpacto?retryWrites=true&w=majority`

### 2. Sembrar Atlas desde tu máquina

En tu `.env` local, apunta `MONGODB_URI` a la cadena de Atlas y define `SEED_ADMIN_USER` y
`SEED_ADMIN_PASSWORD`. Usa una contraseña robusta: el sitio será público. Luego ejecuta:

```bash
npm run seed
```

El usuario y los datos quedan en Atlas; Render no necesita las variables `SEED_*`.

### 3. Servicio web en Render

1. En Render, **New → Blueprint** y conecta el repositorio (autoriza el acceso si es privado).
   Elige la rama a desplegar.
2. Render lee `render.yaml`: build `npm ci --include=dev && npm run build`, arranque `npm start` y
   health check en `/api/v1/salud`. `JWT_SECRET` se genera solo.
3. Cuando lo pida, pega la cadena de Atlas en `MONGODB_URI` y confirma con **Apply**.
4. Al terminar, abre `https://<nombre-del-servicio>.onrender.com/api/v1/salud`: debe responder
   `{"estado":"ok","mongo":true}`. La plataforma está en `https://<nombre-del-servicio>.onrender.com`.

Cada push a la rama elegida vuelve a desplegar. Las rutas de la [guía de capturas](#guía-de-capturas)
funcionan igual reemplazando `http://localhost:5173` por la URL de Render.

**Plan gratuito:** el servicio se suspende tras 15 minutos sin tráfico. La primera visita después
tarda de 30 a 60 segundos en despertar; abre la URL un minuto antes de una presentación.

## Guía de capturas

Con `npm run seed` y `npm run dev` en ejecución, a 1440 × 900 px:

| Captura                                         | URL                                                                                                 | Notas                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Pantalla de acceso                              | `http://localhost:5173/acceso`                                                                      | Sin sesión iniciada (o tras pulsar «Salir»)                              |
| Demanda histórica con filtros aplicados         | `http://localhost:5173/historica?desde=2025-01-06&hasta=2026-04-26&granularidad=semanal`            | Diez productos, una línea por producto                                   |
| Panel de filtros desplegado mostrando su efecto | `http://localhost:5173/historica?sku=IMP-001&desde=2026-02-01&hasta=2026-04-26&granularidad=diaria` | Panel lateral abierto; «Filtros aplicados» y tarjetas reflejan el filtro |
| Proyección a 90 días con tarjetas de métricas   | `http://localhost:5173/proyeccion`                                                                  | Tarjetas MAE · RMSE · R² · Modelo, curva y tabla comparativa             |
| Recomendaciones con productos críticos          | `http://localhost:5173/recomendaciones`                                                             | 4 críticos arriba, luego moderados y estables                            |

Guarda las imágenes en `docs/capturas/`.
