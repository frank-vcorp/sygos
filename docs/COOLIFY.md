# Coolify — SYGOS

## URL

- **FQDN:** https://sygos.vector-ia.mx
- **App UUID:** `3zamnoefpehquagdcvi2578i`
- **PostgreSQL UUID:** `tgymrwtk3tmylx0nbzlysdym` (`sygos_db` / usuario `sygos`)

Registry: `~/.cursor/provision-registry.json` → `frank-vcorp/sygos`.

## Deploy automático

1. **Coolify** tiene `is_auto_deploy_enabled` vía **GitHub App** (`frank-vcorp/sygos`, rama `main`). Si al hacer `git push` no aparece un deployment nuevo en el panel, en Coolify Cloud revisa **Sources → GitHub** y confirma que la app **sygos** sigue autorizada en el repositorio.
2. **Respaldo:** workflow `.github/workflows/coolify-deploy.yml` encola deploy con la API. Secrets del repo (Settings → Secrets → Actions):
   - `COOLIFY_BASE_URL` — p. ej. `https://app.coolify.io`
   - `COOLIFY_API_TOKEN` — token **write** de Coolify (no commitear)
   - `COOLIFY_APP_UUID` — `3zamnoefpehquagdcvi2578i`
3. **Manual desde contabo-integra:** `source ~/.cursor/bin/load-cursor-env.sh && coolify deploy 3zamnoefpehquagdcvi2578i`

## Verificar conexión API (contabo-integra)

```bash
unset CURSOR_ENV_LOADED
source ~/.cursor/bin/load-cursor-env.sh
curl -s -o /dev/null -w "projects HTTP: %{http_code}\n" \
  -H "Authorization: Bearer ${COOLIFY_READ_TOKEN}" \
  -H "Accept: application/json" \
  -H "User-Agent: kilo-coolify-readonly/1.0" \
  "${COOLIFY_BASE_URL}${COOLIFY_API_PREFIX}/projects"
```

Debe responder **200**. Si responde **401**, regenera tokens en Coolify Cloud → Security → API tokens y actualiza `COOLIFY_READ_TOKEN` / `COOLIFY_WRITE_TOKEN` en `~/.cursor/secrets.env` (`chmod 600`). Si `CURSOR_ENV_LOADED=1` ya está en el shell, `load-cursor-env.sh` no recarga: usa `unset CURSOR_ENV_LOADED` antes del `source`, o `env -u CURSOR_ENV_LOADED cursor-provision …`.

## Variables de entorno (panel Coolify, no repo)

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | URL **internal** de la DB, **sin comillas** en el valor (comillas literales rompen `postgres.js`) |
| `NODE_ENV` | `production` |
| `SYGOS_VECTORIA_INITIAL_PASSWORD` | Contraseña inicial del usuario seed **Vectoria** |
| `SYGOS_AUTO_SEED` | `0` en operación normal; `1` solo si quieres re-ejecutar seed en arranque |
| `SYGOS_DEMO_USERS_PASSWORD` | Contraseña compartida de usuarios demo (`ceo`, `coord`, `ger.systron`, …); ejecutar `npm run db:seed-demo` tras migrar |
| `SYGOS_DATA_DIR` | Directorio persistente para logos por empresa (`/app/data`). **Montar volumen** en Coolify en esa ruta para que los logos sobrevivan redeploys |

## Migraciones y seed en producción

`drizzle-kit migrate` necesita `drizzle/*.sql` **y** `drizzle/meta/_journal.json` dentro de la imagen (no ignorar `drizzle/meta` en `.dockerignore`).

Bootstrap one-off desde contabo-integra (SSH al VPS + contenedor en red `coolify`):

```bash
cd ~/repos/sygos
./scripts/coolify-bootstrap-db.sh
```

Tras el primer seed exitoso, deja `SYGOS_AUTO_SEED=0`. Login: https://sygos.vector-ia.mx/login — usuario **Vectoria**; contraseña en la variable de Coolify anterior.

## Provisionar (nuevo entorno)

```bash
cd ~/repos/sygos
unset CURSOR_ENV_LOADED
source ~/.cursor/bin/load-cursor-env.sh
cursor-provision --with-db
```

Luego configura env vars en la app, redeploy, y ejecuta `./scripts/coolify-bootstrap-db.sh` si hace falta.
