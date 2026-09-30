#!/usr/bin/env bash
# Preparación inicial del codespace (se ejecuta una sola vez al crearlo).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ Instalando dependencias…"
npm ci

if [ ! -f .env ]; then
  echo "▶ Creando .env con credenciales aleatorias…"
  secreto=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  clave=$(node -e "console.log(require('crypto').randomBytes(9).toString('base64url'))")
  cat > .env <<ENV
MONGODB_URI=mongodb://127.0.0.1:27017/predictimpacto
PORT=4000
JWT_SECRET=${secreto}
JWT_EXPIRES_IN=8h
SEED_ADMIN_USER=${SEED_ADMIN_USER:-admin}
SEED_ADMIN_PASSWORD=${SEED_ADMIN_PASSWORD:-$clave}
ENV
fi

echo "▶ Esperando a MongoDB…"
for _ in $(seq 1 60); do
  node -e "require('net').connect(27017,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" && break
  sleep 1
done

echo "▶ Sembrando datos…"
npm run seed

echo "▶ Compilando el cliente…"
npm run build
