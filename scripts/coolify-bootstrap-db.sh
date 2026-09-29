#!/usr/bin/env bash
# One-off: migraciones + seed en PostgreSQL de Coolify (ejecutar en contabo-integra).
set -euo pipefail
unset CURSOR_ENV_LOADED
# shellcheck disable=SC1091
source "${HOME}/.cursor/bin/load-cursor-env.sh"
export COOLIFY_READ_TOKEN COOLIFY_WRITE_TOKEN

APP_UUID="${1:-3zamnoefpehquagdcvi2578i}"
DB_UUID="${2:-tgymrwtk3tmylx0nbzlysdym}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SSH_KEY="${HOME}/.ssh/kilo-contabo-vectoria"
VPS="root@212.28.185.217"

mapfile -t _lines < <(
  python3 - "$APP_UUID" "$DB_UUID" "$SSH_KEY" "$VPS" <<'PY'
import json, os, sys, urllib.request, subprocess
app_uuid, db_uuid, ssh_key, vps = sys.argv[1:5]
base = "https://app.coolify.io/api/v1"
token = os.environ["COOLIFY_READ_TOKEN"]

def get(path):
    req = urllib.request.Request(base + path, headers={
        "Authorization": f"Bearer {token}",
        "User-Agent": "kilo-coolify-readonly/1.0",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

db_url = get(f"/databases/{db_uuid}")["internal_db_url"].replace("postgres://", "postgresql://", 1)
envs = get(f"/applications/{app_uuid}/envs")
vectoria = next(e["real_value"] for e in envs if e["key"] == "SYGOS_VECTORIA_INITIAL_PASSWORD")
if vectoria.startswith("'") and vectoria.endswith("'"):
    vectoria = vectoria[1:-1]
img = subprocess.check_output([
    "ssh", "-o", "BatchMode=yes", "-i", os.path.expanduser(ssh_key),
    vps, f"docker ps --format '{{{{.Image}}}}' --filter name={app_uuid} | head -1",
], text=True).strip()
print(db_url)
print(vectoria)
print(img)
PY
)
DBURL="${_lines[0]}"
VECTORIA="${_lines[1]}"
IMG="${_lines[2]}"
if [ ! -f "${REPO_ROOT}/drizzle/meta/_journal.json" ]; then
  echo "Falta ${REPO_ROOT}/drizzle/meta (ejecuta npm run db:generate)." >&2
  exit 1
fi
VPS_DRIZZLE="/tmp/sygos-drizzle"
echo "Sincronizando drizzle/ al VPS (${VPS_DRIZZLE})..." >&2
ssh -o BatchMode=yes -i "$SSH_KEY" "$VPS" "rm -rf $(printf '%q' "$VPS_DRIZZLE") && mkdir -p $(printf '%q' "$VPS_DRIZZLE")/meta"
scp -o BatchMode=yes -i "$SSH_KEY" -r "${REPO_ROOT}/drizzle/meta/"* "${VPS}:${VPS_DRIZZLE}/meta/"
scp -o BatchMode=yes -i "$SSH_KEY" "${REPO_ROOT}"/drizzle/*.sql "${VPS}:${VPS_DRIZZLE}/"

META_MOUNT="-v ${VPS_DRIZZLE}:/app/drizzle:ro"

ssh -o BatchMode=yes -i "$SSH_KEY" "$VPS" \
  "docker run --rm --network coolify --entrypoint sh \
    ${META_MOUNT} \
    -e DATABASE_URL=$(printf '%q' "$DBURL") \
    -e SYGOS_VECTORIA_INITIAL_PASSWORD=$(printf '%q' "$VECTORIA") \
    -e CI=1 $(printf '%q' "$IMG") \
    -c './node_modules/.bin/drizzle-kit migrate && npm run db:seed'"

ssh -o BatchMode=yes -i "$SSH_KEY" "$VPS" \
  "docker exec ${DB_UUID} psql -U sygos -d sygos_db -c 'select code from companies;'"

echo "Bootstrap DB listo."
