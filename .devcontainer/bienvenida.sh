#!/usr/bin/env bash
# Comprueba que la plataforma responda (y la levanta si no) y muestra cómo entrar.
cd "$(dirname "$0")/.."

usuario=$(grep -E '^SEED_ADMIN_USER=' .env 2>/dev/null | cut -d= -f2-)
clave=$(grep -E '^SEED_ADMIN_PASSWORD=' .env 2>/dev/null | cut -d= -f2-)
if [ -n "${CODESPACE_NAME:-}" ]; then
  url="https://${CODESPACE_NAME}-4000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
else
  url="http://localhost:4000"
fi

if bash .devcontainer/iniciar.sh; then
  cat <<MSG

  ☕ PredictImpacto está en marcha
  ────────────────────────────────
  URL:        ${url}
  Usuario:    ${usuario}
  Contraseña: ${clave}

  (También en la pestaña «Puertos» → PredictImpacto)

MSG
else
  cat <<MSG

  ⚠ PredictImpacto no está respondiendo en el puerto 4000.
    Revisa el registro con:  cat /tmp/predictimpacto.log
    Vuelve a intentarlo con: bash .devcontainer/iniciar.sh

MSG
fi
