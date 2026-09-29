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
| 3 | Fase 2 inicio: EQUI, MOT global, ingreso Servomotores | Desplegada |
| 4 | **Slice fases 2–9 (MVP):** migración `0004`, almacén EQUI, custodia MOT SM (egreso/prueba), inventario + toggle SM, técnica (atenciones/diagnóstico/OS/bitácora), cotizaciones + envío multicontacto, finanzas/compras stub, RRHH/kiosco, panel CEO, configuración/modo pruebas, manifest PWA | Desplegada — ver [VALIDACION_AGENTE.md](./VALIDACION_AGENTE.md) |

## Matriz rápida plan → estado (post entrega 4)

| Fase | Estado construcción | Notas |
|------|---------------------|-------|
| 1 | **Mayoría cumple** en staging | Multicontacto en **cotización → enviar** (no email real) |
| 2 | **Parcial** | Flujos EQUI/MOT/almacén/inventario MVP; SLA y reglas finas pendientes |
| 3 | **Parcial** | Pantallas y acciones base; garantías/externo/espejo completo pendiente |
| 4 | **Parcial** | Cotización + multicontacto; sin Facturapi ni flujo comercial completo |
| 5 | **Parcial** | Facturas/pagos registro manual; sin timbrado ni conciliación |
| 6 | **Parcial** | Órdenes de compra MVP |
| 7 | **Parcial** | Empleados + kiosco punch; sin nómina |
| 8 | **Parcial** | Panel CEO placeholder |
| 9 | **Parcial** | Config + manifest; E2E y PWA offline no completos |

## Roadmap de profundización (post-MVP)

- Integraciones reales (Facturapi, etc.), paneles ricos, nómina, SLA/garantías, almacén completo, refacciones ligadas a OS, pruebas E2E Fase 9.

## Verificación final (agente)

Informe browser: [VALIDACION_AGENTE.md](./VALIDACION_AGENTE.md) (actualizar tras cada deploy mayor).

## Nota sobre el plan vs construcción

Algunos ítems del checklist de **Fase 1** (p. ej. contactos en **comunicación**) se **comprueban** cuando existe el flujo de envío (cotizaciones en entrega 4). La matriz ítem → entrega se mantiene en `VALIDACION_AGENTE.md`.
