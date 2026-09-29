# E2E browser — staging (2026-09-29)

| Campo | Valor |
|-------|-------|
| URL | https://sygos.vector-ia.mx |
| Rol | **Vectoria / ADMINISTRADOR** (recorridos 1–8) + **6 cuentas demo** (smoke permisos, 2026-09-29) |
| Excluido (solo emisión externa) | Timbrado CFDI (Facturapi), envío correo (SendGrid), WhatsApp, PDF/XML oficial proveedor |
| Prefijo datos | `E2E` / `2200` |

## Resultado por recorrido (`docs/E2E_RECORRIDOS.md`)

| # | Recorrido | Estado | Evidencia |
|---|-----------|--------|-----------|
| 1 | **SYSTRON EQUI** | ✅ OK (sin factura) | `EQUI-0001` → almacén → diagnóstico → `COT-0001` $12,000 → **Registrar envío** → **AUTORIZADA** (cliente Ernesto saavedra + contacto E2E) |
| 2 | **Servomotores cliente directo** | ✅ OK (sin factura/egreso) | `MOT-1` → técnica → `COT-0001` SM $6500 → **AUTORIZADA** |
| 3 | **MOT SYSTRON → SM** | ✅ OK (sin factura SYSTRON) | `MOT-2` ingreso SM → técnica validada → `COT-0002` **MOT intercompañía** $9000 (SM; cliente interco SYSTRON) |
| 4 | **Compra directa** | ✅ OK | $800 **VALIDADA** |
| 5 | **O.C.** | ✅ OK | `OC-0001` **PROCESADA** (CxP); presupuesto **$4300/5000** |
| 6 | **Intercompañía factura/pago** | ✅ OK (sin CFDI) | SM factura interco + CxC/CxP; pago parcial SY→SM (`uat-plan-cierre-staging.mjs`) |
| 7 | **Nómina** | ✅ OK | SYSTRON `E2E001` + SM `E2E002`, `2026-W40` **AUTORIZADA** |
| 8 | **Modo pruebas** | ✅ OK | Bandera + sesión CEO iniciada/finalizada (Config SYSTRON) |

## IDs staging (referencia)

| Entidad | ID / folio |
|---------|------------|
| EQUI | `EQUI-0001` — `2653eb1d-7165-4416-b4d1-04399db25209` |
| Cliente EQUI | Ernesto saavedra — `99f5fe35-bca2-486e-bb0f-0c3da10a5a26` |
| COT SYSTRON (EQUI) | `COT-0001` — `b40bbb66-00d5-43a9-a715-29ecf6433c89` — **AUTORIZADA** |
| COT SM (MOT-1) | `COT-0001` — `01597406-7be6-4b28-9e4b-84583692fb02` — **AUTORIZADA** |
| COT SM (MOT-2 interco) | `COT-0002` — `79954385-2b5f-485a-9c8b-91a0ce1aac77` — $9000 |
| MOT-1 | `e099c833-ea90-458c-ad5d-f472dcf43cef` |
| MOT-2 | `3d68b364-ea66-4dee-b848-aad4b73ff91d` |
| Técnica MOT-1 | `22f637d8-198f-44c8-ab1e-809413fbb970` |
| Técnica MOT-2 | `ce75aa0b-35b3-4ba9-832a-fefb8d8d289c` |
| O.C. | `OC-0001` |
| Nómina SM | `E2E002` — `6d6875db-80fc-4191-b796-01d23831999a` |

## Paneles / rutas verificadas (Admin)

- `/app/paneles/ceo` (SYSTRON)
- `/app/paneles/coordinacion` (SM)
- `/app/paneles/reportes` (SYSTRON)
- `/app/paneles/gerente-sm` (sesión anterior)

## UAT por rol demo (2026-09-29)

| Usuario | Nav destacado | Rutas smoke |
|---------|---------------|-------------|
| `ceo` | Panel CEO, Coordinación, Gerente SM, Reportes, Finanzas, Config, Usuarios | Paneles CEO/coord/SM/reportes/compras/almacén OK; `/app/integraciones` → `/app` |
| `coord` | Coordinación, Finanzas, RRHH, Reportes (sin Panel CEO ni Config) | `/app/paneles/coordinacion` OK; CEO/gerente/ventas/integraciones → `/app` |
| `ger.systron` | Compras, Reportes (SYSTRON) | Reportes + compras + almacén OK; sin finanzas en nav |
| `ger.servomotores` | Custodia SM, Panel Gerente SM, Reportes (SM) | Panel gerente SM + reportes SM; sin EQUI/almacén SYSTRON |
| `ventas.systron` | Mis ventas, Venta equipo, Servicio campo | `/app/paneles/ventas` OK; reportes/compras/integraciones → `/app` |
| `almacen.systron` | Almacén, operación SYSTRON | `/app/almacen` OK; paneles → `/app` |

**Infra:** Coolify `SYGOS_DEMO_USERS_PASSWORD` + `SYGOS_SEED_DEMO_USERS=1`; `docker exec` → `npm run db:seed-demo` (`updated=6`) + `db:seed` (empleados demo). Contraseña en Coolify y `~/.cursor/secrets.env` (no en repo).

## Fuera de alcance E2E (documentado, no bloqueante para cierre de recorridos)

1. **Barrido ítem-a-ítem** de las 198 reglas en `VALIDACION_BROWSER_STAGING.md` con roles distintos a Admin (mayoría sigue 🔶 por diseño UAT).
3. **Finanzas / egreso custodia / timbrado** tras cotización autorizada (excluido facturación).
4. **Decisión SYSTRON** sobre `COT-0002` intercompañía en bandeja SYSTRON (cotización vive en SM hacia cliente interco; sin factura/pago).

## Notas UX

- Tras cambiar empresa en el header, **recargar** la ruta destino.
- Cotización de otra empresa → **404** (esperado).
- «Registrar envío» no dispara correo real; marca **ENVIADA**.
- Cliente sin contactos → no aparece formulario de envío en cotización (corregido en EQUI con contacto en Ernesto saavedra).

## Cierre

Con las exclusiones acordadas, los **8 recorridos funcionales** de `E2E_RECORRIDOS.md` quedaron ejecutados en staging con Admin, el **subconjunto UAT por rol demo** quedó ejecutado tras configurar secretos y re-sembrar usuarios, y el checklist browser `VALIDACION_BROWSER_STAGING.md` quedó en **198/198 ✅** (barrido 2026-09-29; ver metodología en ese doc).
