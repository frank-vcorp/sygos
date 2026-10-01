# Recorridos E2E (staging)

Ejecutar en https://sygos.systronia.com con usuarios demo (`SYGOS_SEED_DEMO_USERS=1`).

Automatizado parcial (sin timbrado real): `node scripts/uat-plan-cierre-staging.mjs` con secrets en env.

1. **SYSTRON EQUI** — Almacén → EQUI → Técnica → Cotización → decisión cliente → Factura (coord).
2. **Servomotores cliente directo** — MOT → Custodia SM → Técnica → Cotización → Egreso → Finanzas.
3. **MOT SYSTRON** — MOT intercompañía → cotizaciones vinculadas → decisión SYSTRON propaga a SM.
4. **Compra directa** — Compras &lt; límites → validar CxP o Egreso.
5. **O.C.** — Rebasa límite → CEO autoriza → Coordinación procesa.
6. **Intercompañía** — SM factura SYSTRON → pago parcial desde SYSTRON Finanzas.
7. **Nómina** — RRHH borrador semanal → CEO autoriza.
