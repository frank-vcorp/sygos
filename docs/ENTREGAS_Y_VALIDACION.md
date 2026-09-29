# Entregas, construcción y validación SYGOS 3.0

## Criterio (acordado con producto)

Ver **[CRITERIO_DE_TERMINADO.md](./CRITERIO_DE_TERMINADO.md)**. Implementación **completa** según Discovery; seguimiento en **[CHECKLIST_VALIDACION_ESTADO.md](./CHECKLIST_VALIDACION_ESTADO.md)** (191 ítems, todos ✅ al `7ada36b3`).

La iteración `c9fba2c7` (esqueleto MVP) quedó **reemplazada** por cierres fase a fase en `main`.

## Entorno

- **Staging:** https://sygos.vector-ia.mx  
- **Coolify app:** `3zamnoefpehquagdcvi2578i`  
- **DB:** `tgymrwtk3tmylx0nbzlysdym`  
- **Migraciones:** `drizzle/0001` … `0012_tough_wallow.sql`  
- **Secretos:** Coolify (`~/.cursor/secrets.env`), nunca en repo.

## Commits de cierre por fase

| Fase | Commit | Resumen |
|------|--------|---------|
| 1 | `40534076` | Multiempresa, maestros, usuarios, comunicaciones |
| 2 | `3ea28ffb` | Custodia EQUI/MOT, inventario, SLA |
| 3 | `bdec8805` | Técnica, garantías, reparación, servicio externo |
| 4 | `9f04d2a9` | Cotizaciones, bandeja, precios comerciales |
| 5–9 | `123608c3` | Finanzas, compras, RRHH, paneles, integraciones |
| Pendientes / E2E | `7ada36b3` | Egresos, notas crédito, comprobaciones SM, modo pruebas, checklist final |

## Roles en el proceso

| Quién | Qué hace |
|-------|----------|
| **Agente** | Implementación, migración staging, checklist ✅ |
| **Frank** | UAT visual y firma de cierre (ver [E2E_RECORRIDOS.md](./E2E_RECORRIDOS.md)) |

## Verificación

- Checklist maestro: [CHECKLIST_VALIDACION_ESTADO.md](./CHECKLIST_VALIDACION_ESTADO.md)  
- Recorridos E2E: [E2E_RECORRIDOS.md](./E2E_RECORRIDOS.md)  
- Informe browser (complementario): [VALIDACION_AGENTE.md](./VALIDACION_AGENTE.md)
