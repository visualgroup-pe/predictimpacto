#!/usr/bin/env bash
# Levanta la plataforma (API + cliente compilado) en el puerto 4000, en segundo plano.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d client/dist ]; then npm run build; fi
if curl -sf http://localhost:4000/api/v1/salud > /dev/null 2>&1; then exit 0; fi

nohup npm start > /tmp/predictimpacto.log 2>&1 &
for _ in $(seq 1 30); do
  curl -sf http://localhost:4000/api/v1/salud > /dev/null 2>&1 && exit 0
  sleep 1
done
echo "La plataforma no respondió; revisa /tmp/predictimpacto.log" >&2
