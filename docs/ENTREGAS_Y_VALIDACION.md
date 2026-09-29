# Entregas, construcción y validación SYGOS 3.0

## Criterio (acordado con producto)

Ver **[CRITERIO_DE_TERMINADO.md](./CRITERIO_DE_TERMINADO.md)**. Implementación **completa** según Discovery; seguimiento en **[CHECKLIST_VALIDACION_ESTADO.md](./CHECKLIST_VALIDACION_ESTADO.md)**.

No se aceptan entregas etiquetadas como MVP: las fases 2–9 con pantallas mínimas (`c9fba2c7`) quedan **reabiertas** hasta cumplir cada ítem del plan.

## Entorno

- **Staging:** https://sygos.vector-ia.mx  
- **Secretos:** Coolify (`~/.cursor/secrets.env`), nunca en repo.

## Histórico técnico (solo referencia)

| Commit / hito | Nota |
|---------------|------|
| Entregas 1–2b | Fase 1 base (maestros, auth, contactos) — sujeto a checklist |
| `a4108c84` | EQUI/MOT inicio — sujeto a checklist Fase 2 |
| `c9fba2c7` | Esqueleto módulos 2–9 — **no** cierra fases |
| `a4c6d049` | Informe agente obsoleto en alcance; usar checklist |

## Roles en el proceso

| Quién | Qué hace |
|-------|----------|
| **Agente** | Cierra fases 1→9 contra checklist; deploy staging; actualiza estado |
| **Frank** | UAT visual por fase cuando el agente marque la fase ✅ en checklist |

## Verificación

- Checklist maestro: [CHECKLIST_VALIDACION_ESTADO.md](./CHECKLIST_VALIDACION_ESTADO.md)  
- Informe browser (complementario): [VALIDACION_AGENTE.md](./VALIDACION_AGENTE.md) — reemplazar por checklist al avanzar
