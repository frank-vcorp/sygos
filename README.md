# SYGOS 3.0

ERP operativo multiempresa para **SYSTRON** y **Servomotores (SYSTRON Servomotores)**. Unifica operación comercial, técnica, física, administrativa, fiscal, financiera y de personal, manteniendo separación legal y administrativa entre empresas.

**Repositorio:** [github.com/frank-vcorp/sygos](https://github.com/frank-vcorp/sygos)

## Estado del proyecto

| Aspecto | Detalle |
|--------|---------|
| Fases 1–9 | Implementadas en `main`; checklist ✅ — **UAT Frank pendiente** (ver [`docs/CRITERIO_DE_TERMINADO.md`](./docs/CRITERIO_DE_TERMINADO.md)) |
| Staging | https://sygos.vector-ia.mx — DB migrada hasta `0012` |
| Fuente funcional | [`SYGOS_3.0_DISCOVERY_FINAL.md`](./SYGOS_3.0_DISCOVERY_FINAL.md) |
| Validación por fases | [`SYGOS_3.0_PLAN_VALIDACION_FINAL.md`](./SYGOS_3.0_PLAN_VALIDACION_FINAL.md) · seguimiento [`docs/CHECKLIST_VALIDACION_ESTADO.md`](./docs/CHECKLIST_VALIDACION_ESTADO.md) |
| Zona horaria | `America/Mexico_City` |
| Moneda operativa | MXN |

El sistema **no** incluye datos demo en producción. La implementación técnica (stack, arquitectura, persistencia) queda a criterio del equipo de desarrollo siempre que se cumplan los comportamientos del Discovery.

## Qué resuelve

- **SYSTRON:** Cliente → EQUI → Atención → Diagnóstico/Reparación → Cotización → OS → Almacén → Facturación/Remisión → Cobranza → Finanzas.
- **Servomotores (cliente directo):** Cliente → MOT → Ingreso → Diagnóstico/Reparación → Cotización → Egreso → Facturación → Cobranza → Finanzas.
- **Intercompañía:** MOT originado en SYSTRON → operación en Servomotores → cotización/facturación entre empresas → CxC/CxP y pagos reales entre cuentas.

Incluye además venta de equipo, servicio en campo, garantías, servicio externo/maquila, compras y O.C., inventario, nómina, asistencia, comisiones, producción técnica, paneles ejecutivos y reportes.

## Principios clave

1. Dos empresas (`SYSTRON`, `Servomotores`) — **sin vistas consolidadas** entre ambas.
2. Contexto de empresa activo siempre visible; CEO, Coordinación y Administrador cambian de empresa explícitamente.
3. Folios independientes por empresa, excepto **`MOT-*`**, secuencia global compartida.
4. Trazabilidad navegable; cancelación con historial, no borrado destructivo.
5. Roles fijos (sin constructor de permisos).
6. Integraciones reales (Facturapi, SendGrid, etc.) — sin simular éxito en producción.

## Stack (implementación)

Ver [`docs/STACK.md`](./docs/STACK.md).

- **Next.js 15** + **PostgreSQL** + **Drizzle** — consultas indexadas por empresa, despliegue Docker en Coolify.
- Staging: **`https://sygos.vector-ia.mx`** (subdominio `sygos`; si el dominio principal está caído, usar la URL del servicio en Coolify hasta restaurar DNS).

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [Discovery funcional](./SYGOS_3.0_DISCOVERY_FINAL.md) | Requisitos, reglas de negocio, criterios de aceptación (fuente de verdad) |
| [Plan de validación](./SYGOS_3.0_PLAN_VALIDACION_FINAL.md) | Comprobaciones por fase antes de dar por cerrada cada etapa |
| [Plan de construcción en 3 bloques](./CONSTRUCCION_3_BLOQUES.md) | Agrupación de las 9 fases para iteraciones de revisión |
| [Criterio de terminado](./docs/CRITERIO_DE_TERMINADO.md) | Qué cuenta como fase/proyecto cerrado |
| [Recorridos E2E](./docs/E2E_RECORRIDOS.md) | Smoke staging por flujo de negocio |

## Plan de construcción (resumen)

Las **9 fases** del Discovery se agrupan en **3 bloques** revisables:

| Bloque | Fases | Enfoque |
|--------|-------|---------|
| **1 — Operación y activos** | 1–3 | Multiempresa, maestros, EQUI/MOT, custodia, inventario, ciclo técnico e intercompañía |
| **2 — Comercial y dinero** | 4–6 | Cotizaciones, fiscal, cobranza, compras, O.C., finanzas por empresa |
| **3 — Personas, control y cierre** | 7–9 | RRHH, nómina, paneles, reportes, integraciones, modo de pruebas, E2E |

Detalle y criterios de “done” por bloque: [`CONSTRUCCION_3_BLOQUES.md`](./CONSTRUCCION_3_BLOQUES.md).

## Integraciones previstas

- **Facturapi** — CFDI, nómina, cancelaciones (por empresa).
- **SendGrid** — correo transaccional.
- **WhatsApp (Baileys)** — cuando se habilite, vinculación por QR (Administrador).

Credenciales solo en entorno de despliegue (p. ej. Coolify), nunca en el repositorio.

## Usuario inicial

Existe usuario nativo `Vectoria` (Administrador). La contraseña inicial es sensible y no debe documentarse en el repo ni en issues públicos.

## Licencia y uso

Uso privado — SYSTRON / Servomotores / VectorIA. Definir licencia en GitHub cuando corresponda.
