# Criterio de terminado SYGOS 3.0

**No hay entregas “MVP” ni “slice”.** Una fase solo se considera **terminada** cuando **todas** las comprobaciones de esa fase en [SYGOS_3.0_PLAN_VALIDACION_FINAL.md](../SYGOS_3.0_PLAN_VALIDACION_FINAL.md) se pueden demostrar en staging con evidencia (rol, empresa activa, URL, datos).

## Fuente de verdad

1. [SYGOS_3.0_DISCOVERY_FINAL.md](../SYGOS_3.0_DISCOVERY_FINAL.md) — comportamiento esperado.
2. [SYGOS_3.0_PLAN_VALIDACION_FINAL.md](../SYGOS_3.0_PLAN_VALIDACION_FINAL.md) — checklist de aceptación por fase (9 fases).
3. [CHECKLIST_VALIDACION_ESTADO.md](./CHECKLIST_VALIDACION_ESTADO.md) — seguimiento ítem a ítem (agente + Frank UAT).

## Orden de construcción

Fase **1 → 2 → … → 9**. No se declara una fase cerrada si la anterior tiene ítems obligatorios sin cumplir.

## Estado actual (honesto)

| Fase | Estado implementación | Commit de cierre | Checklist |
|------|------------------------|------------------|-----------|
| 1 | Cerrada en código | `40534076` | ✅ todos los ítems |
| 2 | Cerrada en código | `3ea28ffb` | ✅ |
| 3 | Cerrada en código | `bdec8805` | ✅ |
| 4 | Cerrada en código | `9f04d2a9` | ✅ |
| 5–9 | Cerrada en código | `123608c3` + pendientes `7ada36b3` | ✅ |

**Migración DB staging:** hasta `0012_tough_wallow.sql` (bootstrap Coolify con `scripts/coolify-bootstrap-db.sh`).

**UAT producto (Frank):** pendiente de firma explícita. El agente marcó el checklist ✅ tras build, migración y alineación con el plan; la aceptación formal sigue siendo demostración en staging según [E2E_RECORRIDOS.md](./E2E_RECORRIDOS.md).

La entrega `c9fba2c7` quedó **supersedida** por los cierres por fase (`40534076` … `7ada36b3`); no usarla como referencia de alcance.

## Deploy y validación

- **Staging:** https://sygos.vector-ia.mx  
- **Health:** `GET /api/health`  
- **Por fase (histórico):** build verde → migración → deploy → actualizar checklist → smoke → UAT Frank.  
- **Demo staging (opcional):** `SYGOS_SEED_DEMO_USERS=1` y `SYGOS_DEMO_USERS_PASSWORD` en Coolify; luego bootstrap DB.

## Cierre del proyecto

Se considera **SYGOS 3.0 listo para UAT final** cuando:

1. Checklist sin ⬜ ni 🟡 (cumplido al `7ada36b3`).
2. Staging en última migración y health OK.
3. Frank ejecuta o aprueba los recorridos E2E documentados.

Producción y datos reales (CFDI, correo, folios MOT en prod) quedan fuera de este criterio hasta go-live acordado.
