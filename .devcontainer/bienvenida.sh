#!/usr/bin/env bash
# Muestra cómo entrar a la plataforma desde el codespace.
cd "$(dirname "$0")/.."
usuario=$(grep -E '^SEED_ADMIN_USER=' .env 2>/dev/null | cut -d= -f2-)
clave=$(grep -E '^SEED_ADMIN_PASSWORD=' .env 2>/dev/null | cut -d= -f2-)
if [ -n "${CODESPACE_NAME:-}" ]; then
  url="https://${CODESPACE_NAME}-4000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
else
  url="http://localhost:4000"
fi
cat <<MSG

  ☕ PredictImpacto está en marcha
  ────────────────────────────────
  URL:        ${url}
  Usuario:    ${usuario}
  Contraseña: ${clave}

  (También en la pestaña «Puertos» → PredictImpacto)

MSG
