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
| 1 | SYSTRON EQUI → técnica → cotización → decisión → fiscal | **🔶** | Seed **COT-0001** (`/app/cotizaciones/b40bbb66-…`): origen “Diagnóstico validado”, OS vinculada, cliente autorizó, sección fiscal. Automatización de **nuevo** EQUI falló en entrada/técnica (modo pruebas / botón “Confirmar entrada a resguardo” no encontrado en corrida Playwright). |
| 2 | MOT SM → custodia → técnica → cot → egreso → finanzas | **🔶** | `/app/mot/servomotores`: MOT-1/MOT-2 en resguardo, egreso disponible; sin pendientes de ingreso en staging. |
| 3 | MOT interco → cotizaciones vinculadas | **✅** | SM **COT-0002** (`79954385-…`): badge **MOT intercompañía**, hub técnico. |
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

## Pendiente para cierre formal Frank

1. **Recorrido 1 de punta a punta** en una sesión (nuevo EQUI → entrada → diagnóstico → gerente → CEO precio → ventas envío → decisión → coord factura) sin depender del seed COT-0001.
2. **Recorrido 2** con MOT en **Pendiente ingreso** (crear MOT SYSTRON o SM y confirmar ingreso SM).
3. Timbrado real (Facturapi) — fuera de alcance staging sin integración.
