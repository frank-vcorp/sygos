# Entregas, construcción y validación SYGOS 3.0

Este documento define **cómo construimos** frente al Discovery y al [Plan de Validación](./SYGOS_3.0_PLAN_VALIDACION_FINAL.md). El plan oficial es **aceptación por fase de producto**; aquí van **entregas técnicas** y cuándo se verifica cada cosa.

## Entorno

- **Staging:** https://sygos.vector-ia.mx — todo el trabajo autónomo (incl. “nocturno”) va aquí.
- **Secretos:** Coolify, no repo. Usuarios demo solo staging (`SYGOS_DEMO_USERS_PASSWORD`).
- **Orden:** [CONSTRUCCION_3_BLOQUES.md](./CONSTRUCCION_3_BLOQUES.md) — Bloque 1 → 2 → 3 (Fases 1–9).

## Roles en el proceso

| Quién | Qué hace |
|-------|----------|
| **Agente (construcción)** | Implementa fases 1–9 en orden, deploy staging, commits/push según avance. Criterios de entrega propios (funcional mínimo por slice). |
| **Agente (cierre)** | Cuando las **9 fases estén implementadas**, recorre el plan en **browser** y deja informe ítem a ítem (cumple / parcial / N/A + pasos). |
| **Frank** | Revisión **visual UAT por fase** (1…9) en un solo flujo, apoyado en el informe; no bloquea cada commit. |

## Entregas completadas (histórico)

| # | Contenido | Aprobación Frank |
|---|-----------|------------------|
| 1 | Base multiempresa, auth, maestros CRUD, búsqueda CEO/Admin, intercompañía seed, Coolify | Aprobada |
| 2 | Usuarios demo, integraciones (estado), folios maestros, concurrencia/bajas, Mi cuenta | En uso |
| 2b | Múltiples contactos + principal en clientes | Desplegada |
| 3 | Fase 2 inicio: EQUI, MOT global, ingreso Servomotores | En curso |

## Roadmap de construcción (pendiente)

### Bloque 1 — Fases 1–3

- **Fase 1 (resto):** comunicación multicontacto (con primer envío o stub acordado), ítems menores del checklist aún abiertos.
- **Fase 2:** EQUI, MOT global, almacén SYSTRON, ingreso/resguardo/egreso Servomotores, salida a prueba, inventarios.
- **Fase 3:** Diagnóstico, reparación preautorizada, OS, SLA, garantías, bitácora, servicio externo, espejo SYSTRON↔Servomotores.

### Bloque 2 — Fases 4–6

Comercial, cotizaciones, fiscal, pagos, compras, finanzas por empresa.

### Bloque 3 — Fases 7–9

RRHH, kiosco, nómina, paneles, integraciones completas, PWA, modo pruebas, E2E.

## Verificación final (agente)

Al terminar **fase 9** en código:

1. Ejecutar checklist completo de `SYGOS_3.0_PLAN_VALIDACION_FINAL.md`.
2. Evidencia en staging (browser): rol, empresa activa, URL/pantalla.
3. Entregar resumen para UAT de Frank por fase 1…9.

## Nota sobre el plan vs construcción

Algunos ítems del checklist de **Fase 1** (p. ej. contactos en **comunicación**) se **comprueban** cuando existe el flujo de envío (Bloque 2), aunque la regla esté en el capítulo 1 del Discovery. La matriz ítem → entrega se actualiza en este archivo conforme avance la construcción.
