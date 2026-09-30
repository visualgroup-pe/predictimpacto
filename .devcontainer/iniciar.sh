#!/usr/bin/env bash
# Levanta la plataforma (API + cliente compilado) en el puerto 4000, en segundo plano.
# Es idempotente: si ya responde, no hace nada.
set -euo pipefail
cd "$(dirname "$0")/.."

salud() { curl -sf -m 3 http://localhost:4000/api/v1/salud > /dev/null 2>&1; }

if salud; then exit 0; fi
if [ ! -d client/dist ]; then npm run build; fi

# setsid + nohup: el servidor queda en su propia sesión y sobrevive al cierre
# del comando de ciclo de vida que lo lanzó.
setsid nohup npm start > /tmp/predictimpacto.log 2>&1 < /dev/null &

for _ in $(seq 1 30); do
  if salud; then exit 0; fi
  sleep 1
done
echo "La plataforma no respondió en 30 s. Últimas líneas de /tmp/predictimpacto.log:" >&2
tail -20 /tmp/predictimpacto.log >&2 || true
exit 1
