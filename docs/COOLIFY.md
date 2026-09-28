# Coolify — SYGOS

## URL prevista

- **FQDN:** `https://sygos.vector-ia.mx` (subdominio `sygos`)
- Si `vector-ia.mx` no resuelve, usar la URL del servicio en el panel de Coolify hasta restaurar DNS.

## Verificar conexión API (integra)

```bash
unset CURSOR_ENV_LOADED
source ~/.cursor/bin/load-cursor-env.sh
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer ${COOLIFY_READ_TOKEN}" \
  "${COOLIFY_BASE_URL}${COOLIFY_API_PREFIX}/projects"
```

Debe responder **200**. Si responde **401 Unauthenticated**, regenera tokens en Coolify Cloud → Security → API tokens y actualiza `COOLIFY_READ_TOKEN` / `COOLIFY_WRITE_TOKEN` en `~/.cursor/secrets.env` (permisos `600`).

## Provisionar (primera vez)

```bash
cd ~/repos/sygos
source ~/.cursor/bin/load-cursor-env.sh
cursor-provision --with-db
```

Variables en la app (secretos, no repo):

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | PostgreSQL `sygos-db` |
| `SYGOS_VECTORIA_INITIAL_PASSWORD` | Seed usuario Vectoria |
| `SYGOS_AUTO_SEED` | `1` solo primer deploy; luego `0` |

## Estado registry

`sygos` **no** aparece aún en `~/.cursor/provision-registry.json` (solo vectoria-os, qualitra, interactiva).
