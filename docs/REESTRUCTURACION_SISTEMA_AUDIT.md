# Auditoría de reestructuración — SYGOS 3.0

**Fecha:** 2026-10-01  
**Criterio:** [SYGOS_3.0_INSTRUCCION_REESTRUCTURACION_CURSOR.md](../SYGOS_3.0_INSTRUCCION_REESTRUCTURACION_CURSOR.md) §8 + mapa §3.1–3.8  
**Fuente funcional:** [SYGOS_3.0_DISCOVERY_FINAL.md](../SYGOS_3.0_DISCOVERY_FINAL.md)

**Leyenda:** **COMPLETE** · **PARTIAL** · **MISSING**

El checklist histórico marcaba muchas fases ✅; esta auditoría refleja **lo que se puede probar en pantalla**, no solo rutas existentes.

## Resumen por área

| Área | Veredicto | Prioridad reestructuración |
|------|-----------|----------------------------|
| 3.1 Maestros | PARTIAL | Media — colaborador detalle, proveedor↔compras, catálogos |
| 3.2 Operación técnica | PARTIAL | Alta — OS/refacciones/inventario enlazados |
| 3.3 Comercial | PARTIAL | **Alta** — §20.3 captura vendedor incompleta vs Discovery |
| 3.4 Custodia / inventario | PARTIAL | Media — detalle inventario |
| 3.5 Compras | PARTIAL | Media — O.C. detalle con acciones |
| 3.6 Finanzas | PARTIAL | Media — CxC/pago/solicitudes documento |
| 3.7 RRHH | PARTIAL | Alta — detalle colaborador, nómina detalle, bonos/aguinaldo |
| 3.8 Control | PARTIAL | Baja — búsqueda global, reportes |

## Hallazgo que disparó la revisión (Comercial §20.3)

**Camino A (técnica → cotización):** operativo en E2E.  
**Camino B (vendedor inicia cotización):** el flujo de estados existe, pero el alta **no captura** equipo/datos preliminares, servicio/producto, cantidades ni contactos destinatarios como exige el Discovery — solo cliente + referencia opcional.

Eso no es “Camino B aparte”; es **Fase 4 incompleta** respecto al plan de validación.

## Entidades troncales

| Entidad | Estado | Nota |
|---------|--------|------|
| Cliente, Prospecto, EQUI, MOT, Atención, Cotización (post-técnica) | COMPLETE | Hubs y E2E |
| Cotización iniciada vendedor | PARTIAL | Formulario mínimo |
| Proveedor, Colaborador, O.C. detalle, Inventario parte, Pago | PARTIAL | Sin detalle o sin relaciones |
| Agenda/metas comerciales, catálogos, bonos/aguinaldo | MISSING / fuera UI | Confirmar alcance Discovery §47–48 |

## Recomendaciones por fase (orden de construcción INSTRUCCION §10)

1. **Fase 1** — Re-verificar maestros (proveedor hub, catálogos si están en Discovery).
2. **Fase 2** — Custodia ya fuerte; inventario detalle.
3. **Fase 3** — OS navegable, refacciones ↔ reparación.
4. **Fase 4** — **Cerrar §20.3–20.6** (captura comercial completa + ventas/campo + pendientes).
5. **Fases 5–9** — Detalles finanzas/RRHH, paneles, búsqueda.

Detalle extendido por rutas y archivos: generado en auditoría agente 2026-10-01 (mismo contenido que este documento, ampliado en tablas por módulo).
