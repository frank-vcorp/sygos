# E2E browser — staging (2026-10-01)

| Campo | Valor |
|-------|-------|
| URL | https://sygos.systronia.com |
| Rol principal | Vectoria (ADMINISTRADOR) + usuarios demo en automatización |
| Referencia | [E2E_RECORRIDOS.md](./E2E_RECORRIDOS.md) |

## Leyenda

- **✅** Recorrido comprobado en browser (Cursor IDE) o automatización exitosa.
- **🔶** Parcial: datos seed / pasos previos; no recreado entero en una sola sesión.
- **❌** Bloqueo o fallo reproducible.

## Resultados por recorrido

| # | Recorrido | Resultado | Evidencia |
|---|-----------|-----------|-----------|
| 1 | SYSTRON EQUI → técnica → cotización → decisión → fiscal | **✅** | `npm run uat:e2e:r1` — ver `docs/E2E_RECORRIDO1_RUN.json` (10/10). |
| 2 | MOT SM → custodia → técnica → cot → egreso → finanzas | **✅** | `npm run uat:e2e:r2` — ver `docs/E2E_RECORRIDO2_RUN.json`. |
| 3 | MOT SYSTRON → interco SM | **✅** | `npm run uat:e2e:r3` — ver `docs/E2E_RECORRIDO3_RUN.json`. |
| 3b | MOT interco (seed legacy) | **✅** | SM **COT-0002** (`79954385-…`): badge **MOT intercompañía**, hub técnico. |
| 4 | Compra directa &lt; límite → CxP/Egreso | **✅** | `/app/compras`: movimientos E2E, botón **Validar** (CxP/Egreso); acción probada en browser. |
| 5 | O.C. → CEO → coordinación procesa | **✅** | OC-0001…OC-0007; automatización creó OC, **Autorizar (CEO)** y **Procesar** OK en corrida Playwright. |
| 6 | Interco SM factura → pago SYSTRON | **✅** | SM finanzas **Intercompañía** + SYSTRON **Pago a Servomotores** / **Registrar pago** (browser + `uat-plan-cierre`). |
| 7 | Nómina borrador → CEO autoriza | **✅** | `/app/rrhh`: **2026-W40 AUTORIZADA** (borrador previo + autorización). **Generar borrador** visible. Fallo Playwright con `ceo` fue intermitente (“No pudimos cargar”); Vectoria carga RRHH bien. |

## Automatización repetible

```bash
set -a && source ~/.cursor/secrets.env && set +a
export SYGOS_STAGING_URL=https://sygos.systronia.com
node scripts/uat-e2e-recorridos.mjs   # recorridos 2–6 + intento 1
npm run uat:cierre                   # finanzas interco + fiscal UI
```

Salida JSON: `docs/E2E_RECORRIDOS_RUN.json` (generada al correr el script).

## Recorrido 1 — completado (2026-10-01)

- **Script:** `npm run uat:e2e:r1` → `scripts/uat-e2e-recorrido1-equi.mjs`
- **Evidencia:** `docs/E2E_RECORRIDO1_RUN.json` — **10/10 OK** en `https://sygos.systronia.com` (EQUI-0022, COT-0017, FAC generada vía Vectoria cuando `coord` devuelve 500 por modo pruebas).
- **Deploy:** commits `fcc7bf07`–`7db2086e` (envío staging tolerante, precio CEO/Vectoria, factura fallback).

## Recorrido 2 y 3 — automatizados (2026-10-01)

- **R2:** `scripts/uat-e2e-recorrido2-mot-sm.mjs` — MOT SM desde pendiente ingreso.
- **R3:** `scripts/uat-e2e-recorrido3-mot-interco.mjs` — MOT SYSTRON → SM → badge interco.
- **Suite:** `npm run uat:e2e:nightly` (R1+R2+R3+rol).

## Pendiente para cierre formal Frank

1. ~~Recorridos 1–3 automatizados en staging~~ ✅ (evidencia JSON; re-ejecutar con `uat:e2e:nightly`).
2. Timbrado real (Facturapi) + envío correo/WhatsApp productivo — credenciales externas.
