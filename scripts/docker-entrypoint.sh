#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
  echo "[sygos] Running migrations..."
  npx drizzle-kit migrate
  if [ "${SYGOS_AUTO_SEED:-0}" = "1" ]; then
    echo "[sygos] Running seed..."
    npm run db:seed
  fi
else
  echo "[sygos] WARN: DATABASE_URL not set; skipping migrations"
fi

exec node server.js
