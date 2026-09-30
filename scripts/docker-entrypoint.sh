#!/bin/sh
set -eu

strip_wrapping_quotes() {
  value=$1
  case "$value" in
    \'*\') value=${value#\'}; value=${value%\'} ;;
  esac
  printf '%s' "$value"
}

DATA_DIR="${SYGOS_DATA_DIR:-/app/data}"
mkdir -p "${DATA_DIR}/company-logos" 2>/dev/null || true

if [ -n "${DATABASE_URL:-}" ]; then
  DATABASE_URL=$(strip_wrapping_quotes "$DATABASE_URL")
  export DATABASE_URL
  export CI=1
  if [ "${SYGOS_SKIP_MIGRATIONS:-0}" != "1" ]; then
    echo "[sygos] Running migrations..."
    if ! timeout 45 ./node_modules/.bin/drizzle-kit migrate; then
      echo "[sygos] ERROR: migrations failed or timed out"
      exit 1
    fi
  else
    echo "[sygos] Skipping migrations (SYGOS_SKIP_MIGRATIONS=1)"
  fi
  if [ "${SYGOS_AUTO_SEED:-0}" = "1" ]; then
    echo "[sygos] Running seed..."
    SYGOS_VECTORIA_INITIAL_PASSWORD=$(strip_wrapping_quotes "${SYGOS_VECTORIA_INITIAL_PASSWORD:-}")
    export SYGOS_VECTORIA_INITIAL_PASSWORD
    CI=1 npm run db:seed
  fi
else
  echo "[sygos] WARN: DATABASE_URL not set; skipping migrations"
fi

exec node server.js
