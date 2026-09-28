# Stack técnico SYGOS 3.0

Decisión orientada a **consultas rápidas**, operación ERP multiempresa y despliegue en **Coolify** (Docker).

## Capas

| Capa | Elección | Motivo |
|------|----------|--------|
| UI | **Next.js 15** (App Router, RSC, Turbopack en dev) | Una sola app desplegable; listados y formularios en servidor = menos latencia y bundles pequeños |
| Datos | **PostgreSQL 16** | Relaciones fuertes, índices compuestos por `company_id`, JSON cuando haga falta |
| Acceso a datos | **Drizzle ORM** + driver **postgres.js** | SQL explícito, consultas preparadas, bajo overhead vs ORMs pesados |
| Auth (Bloque 1) | Sesiones en **PostgreSQL** + cookie httpOnly | Sin JWT stateless; revocación y multi-sesión alineadas al Discovery |
| Estilos | **Tailwind CSS 4** | UI sobria SaaS, responsiva (Discovery §58) |
| Contenedor | **Dockerfile** multi-stage + `output: "standalone"` | Build reproducible en Coolify |

## Rendimiento (convenciones desde Bloque 1)

- Toda entidad operativa llevará **`company_id`** (excepto MOT global) e índices `(company_id, …)` para listados.
- Secuencia **MOT** global en tabla dedicada (`folio_sequences`, scope `GLOBAL_MOT`).
- Evitar N+1: joins explícitos en Drizzle; paginación cursor/keyset en tablas grandes (más adelante).
- **Redis** solo si medimos cuello de botella (sesiones/cache); no en v1 del scaffold.

## Despliegue Coolify

- Dominio previsto: **`https://sygos.vector-ia.mx`** (slug del repo).
- Si la zona `vector-ia.mx` está caída, Coolify sigue sirviendo la app; se puede usar la **URL generada del servicio** en el panel hasta restaurar DNS.
- Provision: `cursor-provision --with-db` (PostgreSQL + app).
- Secretos en Coolify (no en git):
  - `DATABASE_URL` (vinculado a la DB)
  - `SYGOS_VECTORIA_INITIAL_PASSWORD`
  - `SYGOS_AUTO_SEED=1` solo en el **primer** deploy con DB vacía; luego `0`.

## Local

```bash
cp .env.example .env
# Editar DATABASE_URL y contraseña inicial
npm install
npm run db:push   # o db:migrate tras generate
SYGOS_VECTORIA_INITIAL_PASSWORD='…' npm run db:seed
npm run dev
```

Health: `GET /api/health`
