# Informe de validación agente — SYGOS 3.0 staging

- **Fecha:** 2026-09-28  
- **Entorno:** https://sygos.vector-ia.mx  
- **Commit desplegado:** `c9fba2c7` (migración `0004` aplicada vía `scripts/coolify-bootstrap-db.sh`)  
- **Sesión de prueba:** usuario `vectoria` / rol **ADMINISTRADOR** (sesión ya activa en browser)

Leyenda: **C** cumple · **P** parcial · **N** no verificado en esta pasada · **—** pendiente de producto

## Resumen por fase

| Fase | Veredicto | Comentario |
|------|-----------|------------|
| 1 Base multiempresa y maestros | **P** | Base y nav OK; multicontacto en envío de cotización, no email |
| 2 EQUI, MOT, almacén, inventario | **P** | Rutas `/app/equi`, `/app/mot`, `/app/almacen`, `/app/mot/servomotores`, `/app/inventario`; reglas SLA/custodia finas no auditadas E2E |
| 3 Operación técnica | **P** | `/app/tecnica`, atenciones/diagnóstico/OS/bitácora MVP |
| 4 Comercial | **P** | `/app/cotizaciones` (+ pendientes, nueva); sin pipeline comercial completo |
| 5 Finanzas | **P** | `/app/finanzas` registro manual; sin timbrado Facturapi |
| 6 Compras | **P** | `/app/compras` MVP |
| 7 RRHH / kiosco | **P** | `/app/rrhh`, `/app/kiosco`; sin nómina |
| 8 Paneles | **P** | `/app/paneles/ceo` placeholder |
| 9 Config, PWA, pruebas | **P** | `/app/configuracion`, `manifest.webmanifest`; sin E2E automatizado |

## Fase 1 — muestra de comprobaciones

| Ítem plan | Estado | Evidencia |
|-----------|--------|-----------|
| Contextos SYSTRON y Servomotores | C | Botones empresa en header (`/app`) |
| Cambio de empresa CEO/Coord/Admin | C | UI visible; no re-probado con `ceo` en esta pasada |
| Maestros por empresa | C | Nav Clientes/Prospectos/Proveedores |
| Múltiples contactos cliente | C | Entrega 2b (no re-abierto hoy) |
| Comunicación multicontacto | P | Cotización → enviar registra `quote_send_contacts` |
| Folios por empresa / MOT global | P | Código + entregas previas; sin crear MOT hoy |
| Búsqueda global CEO/Admin | C | Campo en nav |
| Integraciones explícitas si faltan | C | `/app/integraciones` (entrega 2) |
| Sin datos demo en seed prod | C | Seed skipped en staging |

## Fase 2 — muestra

| Ítem | Estado | Evidencia |
|------|--------|-----------|
| Almacén SYSTRON (EQUI) | C | `/app/almacen` — título “Almacén SYSTRON”, lista vacía |
| Custodia MOT Servomotores | P | `/app/mot/servomotores` (no recorrido completo hoy) |
| Inventario SM deshabilitado por defecto | P | `company_settings` + toggle en config/inventario |
| MOT no en almacén SYSTRON | P | Copy en almacén; regla en código |

## Fases 3–9 — smoke URLs (ADMIN, SYSTRON activo)

| Ruta | HTTP / UI |
|------|-----------|
| `/app/tecnica` | OK — “Operación técnica”, enlace Nueva atención |
| `/app/cotizaciones` | OK — Pendiente de cotizar / Nueva |
| `/app/almacen` | OK |
| `/app/inventario` | N | No abierto en esta pasada |
| `/app/finanzas` | N | No abierto en esta pasada |
| `/app/compras` | N | No abierto en esta pasada |
| `/app/rrhh` | N | No abierto en esta pasada |
| `/app/kiosco` | N | Requiere rol KIOSCO |
| `/app/paneles/ceo` | N | No abierto en esta pasada |
| `/app/configuracion` | N | No abierto en esta pasada |

## Gaps conocidos (no bloquean deploy MVP)

- Facturapi, correo real, nómina, paneles analíticos, SLA automático, garantías completas, reservas de refacciones, transferencias inventario, suite E2E Fase 9.
- Profundizar flujos con usuarios demo (`ceo`, `ger.servomotores`, `almacen.systron`, etc.) y contraseña `SYGOS_DEMO_USERS_PASSWORD` en UAT de Frank.

## Próximo paso recomendado (Frank)

UAT visual fase por fase usando [SYGOS_3.0_PLAN_VALIDACION_FINAL.md](../SYGOS_3.0_PLAN_VALIDACION_FINAL.md), anotando **C/P/N** en cada ítem; priorizar un flujo punta a punta: MOT SYSTRON → ingreso SM → técnica → cotización multicontacto → factura borrador.
