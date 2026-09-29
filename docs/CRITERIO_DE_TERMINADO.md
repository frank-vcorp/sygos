# Criterio de terminado SYGOS 3.0

**No hay entregas “MVP” ni “slice”.** Una fase solo se considera **terminada** cuando **todas** las comprobaciones de esa fase en [SYGOS_3.0_PLAN_VALIDACION_FINAL.md](../SYGOS_3.0_PLAN_VALIDACION_FINAL.md) se pueden demostrar en staging con evidencia (rol, empresa activa, URL, datos).

## Fuente de verdad

1. [SYGOS_3.0_DISCOVERY_FINAL.md](../SYGOS_3.0_DISCOVERY_FINAL.md) — comportamiento esperado.
2. [SYGOS_3.0_PLAN_VALIDACION_FINAL.md](../SYGOS_3.0_PLAN_VALIDACION_FINAL.md) — checklist de aceptación por fase (9 fases).
3. [CHECKLIST_VALIDACION_ESTADO.md](./CHECKLIST_VALIDACION_ESTADO.md) — seguimiento ítem a ítem (agente + Frank UAT).

## Orden de construcción

Fase **1 → 2 → … → 9**. No se declara una fase cerrada si la anterior tiene ítems obligatorios sin cumplir.

## Estado actual (honesto)

| Fase | Estado |
|------|--------|
| 1 | **En cierre** — base multiempresa y maestros mayormente hechos; faltan reglas de usuarios Administrador, descuentos vendedor, comunicación en todos los flujos, etc. |
| 2–9 | **No terminadas** — existen rutas y tablas iniciales de una iteración anterior; **no** cumplen el Discovery ni el plan de validación. |

La entrega técnica `c9fba2c7` (pantallas ampliadas) **no** cuenta como fases 2–9 completas; se reutiliza solo lo que pase revisión contra el checklist.

## Deploy y validación

- Staging: https://sygos.vector-ia.mx  
- Cada bloque de cierre de fase: build verde, migración, deploy, actualización de `CHECKLIST_VALIDACION_ESTADO.md`, smoke browser, luego UAT Frank.
