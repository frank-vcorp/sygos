# Plan de ejecución — reestructuración completa SYGOS 3.0

## Principio (lo que pediste)

- **No** entregas “MVP” ni caminos sueltos (solo A o solo B).
- **Sí** avanzar **fase por fase** (1 → 9), en el orden del Discovery / Plan de validación.
- Cada fase se **cierra del todo** antes de pasar a la siguiente: campos, flujos, detalle, relaciones, permisos, vacíos/errores, y **prueba demostrable** (script UAT o recorrido documentado).
- Si algo del Discovery no aplica, se **documenta explícitamente** (no se marca ✅ en silencio).

## Definition of Done por fase

Para cada fase, antes de marcar cerrada:

1. Todos los ítems de [SYGOS_3.0_PLAN_VALIDACION_FINAL.md](../SYGOS_3.0_PLAN_VALIDACION_FINAL.md) demostrables en staging.
2. Criterios [INSTRUCCION §8](../SYGOS_3.0_INSTRUCCION_REESTRUCTURACION_CURSOR.md) para entidades del módulo.
3. Actualizar [CHECKLIST_VALIDACION_ESTADO.md](./CHECKLIST_VALIDACION_ESTADO.md) con evidencia (URL + rol + commit).
4. Smoke automatizado donde exista (`uat:e2e:*`, `uat:rol`); ampliar scripts si hace falta.

## Estado honesto (2026-10-01)

| Fase | Declaración anterior | Re-audit |
|------|---------------------|----------|
| 1 | ✅ | Re-verificar (proveedor, catálogos) |
| 2 | ✅ | Re-verificar (inventario detalle) |
| 3 | ✅ | Completar OS/refacciones |
| 4 | 🟡→✅ UI §20.3 | Captura completa en código; falta UAT §9 documentada post-deploy |
| 5–9 | ✅ | Re-verificar detalles (finanzas, RRHH, búsqueda) |

E2E nocturno (R1–R3) valida **troncos operativos**; no sustituye cerrar Fase 4 comercial “iniciada por vendedor” ni RRHH/finanzas al detalle.

## Orden de trabajo (ejecución)

```text
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7 → Fase 8 → Fase 9
         ↑ cada una: implementar → migración si aplica → deploy staging → UAT → checklist
```

### Fase 4 — entregables concretos (ejemplo de “paso completo”)

Cuando toque cerrar Fase 4 de verdad:

- Formulario **Nueva cotización** con: tipo oferta (§20.1), líneas servicio/producto + cantidad, equipo existente o datos preliminares (§20.6), referencia/observaciones, contactos destinatarios previstos.
- Misma captura en **Venta equipo** / **Servicio en campo** (origen distinto, mismo cuerpo comercial).
- Detalle cotización: ver/editar contexto mientras `pendingPricing` y sin atención técnica origen.
- PDF con líneas solicitadas; CEO sigue fijando **precio global** (sin catálogo SKU salvo que Discovery lo exija después).
- Script UAT: recorrido §9 INSTRUCCION (vendedor → CEO → envío → decisión).

(Las fases 1–3 y 5–9 tendrán listas similares en este doc conforme se cierren.)

## Cómo lo revisas tú

Por cada fase cerrada recibes:

- Enlace staging + commit.
- Checklist actualizado (sin ✅ falsos).
- Recorrido en `docs/UAT_*` o ampliación `npm run uat:*`.

## Siguiente acción agente

1. **Reabrir Fase 4 en checklist** (ítems §20.3 → 🟡).
2. Implementar Fase 4 completa según lista anterior.
3. Continuar Fase 3 gaps (OS/refacciones) y Fase 7 (RRHH detalle) en orden, sin saltar validación de dependencias.

Integraciones externas (Facturapi, SendGrid) siguen en **Camino A producto** paralelo; no bloquean cerrar captura comercial UI.
