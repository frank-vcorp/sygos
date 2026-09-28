#!/bin/sh
set -eu

strip_wrapping_quotes() {
  value=$1
  case "$value" in
    \'*\') value=${value#\'}; value=${value%\'} ;;
  esac
  printf '%s' "$value"
}

if [ -n "${DATABASE_URL:-}" ]; then
  DATABASE_URL=$(strip_wrapping_quotes "$DATABASE_URL")
  export DATABASE_URL
  echo "[sygos] Running migrations..."
  ./node_modules/.bin/drizzle-kit migrate
  if [ "${SYGOS_AUTO_SEED:-0}" = "1" ]; then
    echo "[sygos] Running seed..."
    npm run db:seed
  fi
else
  echo "[sygos] WARN: DATABASE_URL not set; skipping migrations"
fi

exec node server.js
