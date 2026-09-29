# VECTORIA_PLAN_VALIDACION

version: 1.0  
nombre: Plan de Validación  
referencia: SYGOS_3.0_DISCOVERY_FINAL.md  
fases: 9  
checklist_obligatorio: false

Este Plan de Validación utiliza exactamente las mismas fases del Discovery consolidado. Cada fase debe poder comprobarse funcionalmente antes de considerarse terminada.

# Fase 1 - Base multiempresa, usuarios, configuración y maestros

## Objetivo

Validar la base funcional de SYGOS 3.0 como sistema multiempresa, con separación estricta entre SYSTRON y Servomotores, roles fijos, contexto activo visible, catálogos maestros y reglas transversales.

## Comprobaciones

- Existen los contextos `SYSTRON` y `Servomotores`.
- CEO, Coordinación y Administrador pueden cambiar de empresa.
- Los usuarios operativos normales solo acceden a su empresa.
- No existe ninguna vista consolidada de ambas empresas.
- El contexto activo es evidente antes de capturar o consultar datos.
- Administrador conserva acceso adicional a Integraciones y cuentas Administrador.
- CEO no puede consultar ni administrar cuentas Administrador.
- Clientes, Prospectos y Proveedores se separan por empresa.
- Los Clientes admiten múltiples contactos y uno principal.
- En una comunicación pueden elegirse uno o varios contactos sin alterar el principal.
- Existe Cliente intercompañía `SYSTRON` en Servomotores y Proveedor `Servomotores` en SYSTRON.
- Folios normales son independientes por empresa.
- Solo MOT utiliza secuencia global compartida.
- Búsqueda global está disponible solo para CEO/Administrador y respeta empresa activa/permisos.
- Los registros no se sobrescriben silenciosamente ante edición concurrente.
- Las cancelaciones e historiales respetan trazabilidad.
- El sistema inicia sin datos demo.
- Configuración faltante de una integración se muestra de forma explícita.

## Resultado esperado

Existe una base multiempresa coherente donde cada usuario ve y opera exclusivamente lo permitido, los maestros están separados y las reglas de identidad, folios, navegación y trazabilidad son consistentes antes de iniciar operación física o técnica.

# Fase 2 - EQUI, MOT, custodia física e Inventario

## Objetivo

Validar la identidad física de equipos y motores, la custodia en ambas empresas, los movimientos de entrada/salida y la operación de Inventario sin mezclar existencias.

## Comprobaciones

- EQUI se usa para equipos SYSTRON no pertenecientes al flujo MOT.
- Una etiqueta EQUI existente conserva la identidad/historia del mismo equipo.
- Serial de fabricante no sustituye el folio.
- Todo motor/servomotor usa MOT.
- La secuencia MOT es única entre ambas empresas.
- SYSTRON solo ve MOT originados en SYSTRON.
- Servomotores ve MOT propios y provenientes de SYSTRON.
- Un MOT de SYSTRON no ingresa al Almacén SYSTRON.
- El Gerente Operativo de Servomotores ve el pendiente de Ingreso.
- Confirmar Ingreso en Servomotores inicia custodia y SLA.
- SYSTRON mantiene Entradas, En resguardo y Salidas para EQUI/mercancía aplicable.
- Servomotores mantiene Ingresos, En resguardo y Egresos para MOT.
- Salida a prueba no cierra artificialmente el proceso.
- Si una salida a prueba se convierte en permanencia fuera, no se exige retorno ficticio.
- Un Egreso definitivo conserva destinatario físico y documento habilitante.
- Un MOT de SYSTRON puede entregarse directamente desde Servomotores al destinatario final indicado.
- Inventario SYSTRON maneja mínimos/máximos informativos.
- Mínimos/máximos no generan compras ni reservas automáticas.
- Inventario Servomotores inicia deshabilitado.
- Administrador puede habilitarlo.
- Al habilitarlo inicia vacío y separado de SYSTRON.
- No existe transferencia/stock compartido entre empresas.

## Resultado esperado

La identidad y custodia física se pueden seguir sin ambigüedad, MOT funciona como identidad compartida sin mezclar administraciones y cada empresa mantiene inventario independiente según su capacidad habilitada.

# Fase 3 - Operación técnica, Garantías y relación Servomotores

## Objetivo

Validar Diagnósticos, Reparaciones preautorizadas, OS, Garantías, SLA, Bitácora Técnica, Servicio Externo y el recorrido técnico intercompañía.

## Comprobaciones

- Los tipos vigentes son Diagnóstico, Reparación y Diagnóstico de Garantía.
- No existe Reparación urgente.
- No existe Diagnóstico Servomotor en SYSTRON.
- Diagnóstico maneja prioridades Normal/Alta/Exprés con snapshot de precio/SLA.
- Reparación maneja catálogo de prioridad propio con incremento porcentual.
- El SLA inicia con Ingreso físico.
- Diagnóstico SYSTRON terminado pasa a validación del Gerente Operativo.
- Gerente Operativo puede validar o devolver a corrección.
- La devolución conserva motivo, instrucción, autor y fecha.
- Solo el cierre técnico finalmente validado recibe atribución de producción.
- Reparación preautorizada puede iniciar y terminar técnicamente antes de Cotización.
- Refacciones incompletas llevan a `En espera de refacciones`.
- Surtido completo devuelve a `En reparación`.
- Bitácora Técnica es inmutable y conserva autor/fecha.
- Para MOT SYSTRON, estado y Bitácora Servomotores se reflejan en SYSTRON como solo lectura.
- SYSTRON no puede cambiar estados técnicos de Servomotores.
- Diagnóstico de Garantía conserva vigencia de 6 meses desde la salida original pagada.
- Gerente Operativo determina Garantía válida/no procedente.
- CEO puede convertir una no procedente en válida por decisión comercial antes de consecuencias incompatibles.
- En MOT SYSTRON, Garantía válida determinada por Servomotores se propaga sin segunda aprobación del CEO.
- Servicio Externo conserva custodia, proveedor, salida/retorno y antecedentes.

## Resultado esperado

El sistema soporta el ciclo técnico completo, incluida la colaboración SYSTRON-Servomotores, sin duplicar identidad ni perder trazabilidad, y diferencia correctamente cierre técnico de cierre comercial/administrativo.

# Fase 4 - Operación comercial

## Objetivo

Validar la creación y seguimiento de Cotizaciones, el flujo unificado `Pendiente de cotizar`, descuentos, Cotización sin equipo físico, intercompañía, Venta de equipo y operación comercial.

## Comprobaciones

- Vendedor puede iniciar una Cotización sin capturar precio.
- Cliente, contexto, equipo/datos preliminares, contactos y referencia comercial pueden capturarse.
- La Cotización iniciada sin precio aparece al CEO/Administrador como `Pendiente de cotizar`.
- Diagnósticos validados, Reparaciones pendientes de precio, Garantías no procedentes y MOT intercompañía llegan a la misma bandeja.
- El origen del pendiente es visible.
- CEO/Administrador determina y edita el precio.
- Vendedor no puede modificar el precio.
- Vendedor puede aplicar descuento hasta el máximo configurado en su ficha.
- No puede rebasar su porcentaje autorizado.
- Vendedor puede seleccionar uno o varios contactos para envío.
- Cotización sin equipo físico puede quedar `Autorizada - Pendiente de ingreso de equipo`.
- Esa autorización no crea OS hasta que exista equipo y se confirme Ingreso físico.
- Una reparación sin Diagnóstico previo puede recotizarse por CEO/Administrador conservando revisiones.
- En MOT intercompañía, Servomotores cotiza a SYSTRON.
- Vendedor SYSTRON no ve el precio base Servomotores.
- Gerente Operativo Servomotores no ve el precio final/margen SYSTRON.
- CEO SYSTRON puede usar el precio Servomotores como costo/base.
- La decisión del cliente final propaga Autorizada/No autorizada a la Cotización Servomotores vinculada.
- No existe subflujo especial de recotización intercompañía.
- Venta de equipo y Servicio en campo conservan sus reglas de operación.
- Panel de Ventas no muestra costos internos.

## Resultado esperado

Las Cotizaciones se crean y completan sin duplicar flujos, el CEO concentra la determinación de precio, el Vendedor conserva seguimiento comercial y la separación de costos entre empresas se respeta.

# Fase 5 - Facturación, Remisiones, Pagos, Cobranza e intercompañía fiscal

## Objetivo

Validar documentos fiscales/comerciales, Pagos, CxC/Cobranza y la relación fiscal entre Servomotores y SYSTRON.

## Comprobaciones

- Cada empresa usa su propia identidad/configuración fiscal.
- Vendedor SYSTRON y Gerente Operativo Servomotores pueden solicitar Factura.
- Coordinación genera Facturas en la empresa activa.
- Coordinación puede iniciar Factura cuando una operación requiere factura aunque no exista solicitud.
- Facturación parcial no permite sobrefacturación.
- Vendedor no genera Remisiones; las solicita.
- Gerente Operativo Servomotores puede solicitar Remisión.
- Coordinación genera Remisiones.
- Remisión puede habilitar salida sin eliminar obligación futura de Factura.
- Factura libre no crea entidades operativas artificiales.
- Pago registrado queda pendiente de validación cuando corresponda.
- Solo Pago validado reduce saldos.
- Crédito anticipado de Cliente requiere aplicación manual posterior.
- Política de efectivo SYSTRON se respeta para Facturas de clientes que requieren factura.
- Servomotores puede facturar a SYSTRON sin depender del cierre técnico o facturación al cliente final.
- Factura intercompañía genera CxC Servomotores y CxP SYSTRON relacionadas.
- El pago SYSTRON -> Servomotores genera salida real e ingreso real.
- Pago intercompañía puede ser parcial.
- No existe compensación ficticia.
- Fallo de Facturapi permite reintento sin duplicar CFDI.
- Cancelaciones/notas de crédito respetan autorización y ejecución definidas.

## Resultado esperado

La documentación fiscal y comercial se procesa por empresa, Cobranza refleja solo Pagos válidos y la facturación/pago intercompañía conserva dos administraciones ligadas sin duplicar dinero.

# Fase 6 - Compras, O.C., Finanzas y CxP

## Objetivo

Validar Compras directas, límites del Gerente Operativo, O.C., procesamiento por Coordinación, CxP y Finanzas independientes.

## Comprobaciones

- Existe módulo Compras por empresa.
- Gerente Operativo, Coordinación, CEO y Administrador acceden según permisos.
- El Gerente tiene presupuesto mensual default $5,000 MXN configurable.
- Tiene máximo por compra directa default $2,000 MXN configurable.
- Ambos límites operan por mes calendario.
- El sobrante mensual no se acumula.
- Una compra directa debe cumplir ambos límites.
- Una compra registrada consume presupuesto aun antes de validación.
- Coordinación puede editar/eliminar una compra directa para cuadrarla.
- Editar/eliminar recalcula/libera presupuesto.
- Si una edición rebasa límites, la compra ya no puede permanecer como directa.
- Compra directa validada se vincula a exactamente un Egreso o una CxP.
- O.C. representa solicitud interna, no compromiso con proveedor.
- O.C. se usa al rebasar límites o requerir autorización.
- Solo CEO autoriza O.C.
- O.C. creada directamente por CEO queda autorizada.
- O.C. autorizada no consume la bolsa mensual.
- Coordinación ve O.C. autorizadas pendientes de procesar.
- Cambios materiales requieren nueva autorización CEO.
- Una O.C. termina en exactamente un Egreso o una CxP.
- CEO o Coordinación pueden cancelar O.C. autorizada con motivo.
- Una O.C. por sí sola no afecta bancos ni genera deuda.
- Finanzas de SYSTRON y Servomotores están completamente separadas.
- No existe dashboard financiero consolidado.
- Pendientes de comprobación Servomotores permiten registrar pago antes de factura sin duplicar egreso al regularizar.
- Movimientos confirmados navegan a su origen.

## Resultado esperado

Compras puede operarse con autonomía controlada, O.C. cubre las excepciones autorizadas y las finanzas reflejan únicamente obligaciones/movimientos reales dentro de cada empresa.

# Fase 7 - Personal, Asistencia, Vacaciones, Nómina y Comisiones

## Objetivo

Validar RRHH y Nómina por empresa, incluyendo las reglas ordinarias y las excepciones de Servomotores.

## Comprobaciones

- Cada empresa mantiene sus propios colaboradores/Nómina.
- Colaborador activo tiene usuario ERP.
- Ayudante General tiene usuario sin panel operativo.
- Jefe directo se conserva con historia.
- Gerente Operativo Servomotores tiene CEO como jefe.
- Ayudante General tiene Gerente Operativo como jefe.
- Salarios timbrado/efectivo conservan historial.
- Kiosco aplica solo a colaboradores elegibles.
- Gerente Operativo Servomotores no usa Kiosco ni horario.
- Vacaciones son solicitadas por jefe directo.
- CEO/Administrador valida.
- Si CEO/Administrador es jefe, su acción resuelve la autorización.
- Solo lunes-viernes consumen vacaciones.
- Prima vacacional se genera automáticamente al 25%.
- Prima usa salario diario total y distribución timbrado/efectivo proporcional.
- Si las vacaciones cruzan semanas, la prima se divide por días en cada Nómina.
- Horas extra no permiten elegir tipo manualmente.
- Acumulación semanal 1-9 Doble, 10+ Triple.
- Una solicitud puede dividirse entre ambos tramos.
- Ayudante General tiene Horas extra originadas por Gerente Operativo y autorización final CEO/Administrador.
- Gerente Operativo Servomotores no tiene Horas extra, Vacaciones, prima vacacional, Aguinaldo ni Bonos.
- Su Nómina contiene solo salario fijo.
- Distribuciones de utilidades se manejan fuera de Nómina.
- Nómina autorizada no se reabre.
- Fallo de timbrado permite reintento sin duplicar.
- Comisiones SYSTRON respetan los esquemas vigentes.

## Resultado esperado

La Nómina puede cerrarse correctamente en ambas empresas, respetando asistencia, Vacaciones y Horas extra ordinarias sin aplicar conceptos indebidos al Gerente Operativo de Servomotores.

# Fase 8 - Producción, paneles ejecutivos y Reportes

## Objetivo

Validar indicadores, bandejas de decisión y Reportes sin mezclar empresas ni conceder permisos adicionales.

## Comprobaciones

- Producción Técnica atribuye resultados al cierre técnico final validado.
- Gerente Operativo SYSTRON no recibe producción técnica por no ejecutar.
- Gerente Operativo Servomotores sí puede recibir atribución de su trabajo técnico.
- Panel CEO siempre corresponde a una empresa activa.
- No existe resumen consolidado.
- `Pendientes de cotizar` reúne todos los orígenes definidos.
- O.C. pendientes de autorización aparecen al CEO.
- Panel Coordinación muestra Facturación, Remisiones, Pagos, Compras/O.C., CxP, Cobranza y Nómina.
- Servomotores muestra pendientes de comprobación cuando existan.
- Panel Gerente Operativo Servomotores concentra Ingresos, técnicos, Cotizaciones/seguimiento, Compras y Egresos.
- Reportes se ejecutan por empresa.
- Los reportes no conceden permisos para editar datos.
- KPI/indicadores navegan a registros origen.
- Reportes exportan respetando filtros.
- Búsqueda/Paneles no exponen precio base Servomotores al Vendedor.

## Resultado esperado

Los usuarios pueden operar sus pendientes y analizar resultados con información coherente de una sola empresa, preservando permisos y navegación a datos de origen.

# Fase 9 - Integraciones, Modo de Pruebas y cierre transversal

## Objetivo

Validar los recorridos completos, integraciones, errores, reintentos, documentos, experiencia responsive/PWA y aislamiento del Modo de Pruebas.

## Comprobaciones

- Facturapi, SendGrid y demás integraciones muestran configuración/estado real.
- Producción nunca simula éxito.
- Credenciales protegidas no vuelven a mostrarse completas.
- Facturapi usa configuración de la empresa correspondiente.
- Los errores indican si una operación quedó guardada o no.
- Los reintentos no duplican efectos.
- Documentos oficiales del proveedor se conservan cuando existan.
- Archivos persistentes pueden consultarse/descargarse desde su origen.
- Modo de Pruebas solo puede activarlo/finalizarlo Administrador según reglas.
- Usuarios seleccionados operan contexto temporal.
- Usuarios no seleccionados continúan producción.
- El contexto de prueba respeta acceso multiempresa.
- No se consumen folios reales, incluida secuencia MOT.
- No se afectan Inventarios, Finanzas, CxC, CxP, Nómina ni Reportes reales.
- No se ejecutan CFDI/correos/WhatsApp reales.
- Al finalizar se descartan cambios de prueba.
- El producto es utilizable en escritorio, tablet y móvil.
- Las funciones esenciales siguen disponibles en móvil.
- PWA puede instalarse cuando corresponda sin prometer trabajo offline.
- Se ejecutan recorridos extremo a extremo:
  - SYSTRON EQUI.
  - Servomotores cliente directo.
  - MOT originado en SYSTRON.
  - Compra directa.
  - O.C.
  - Facturación/pago intercompañía.
  - Nómina de ambas empresas.
- La documentación del repo en GitHub está alineada con el Discovery (README, descripción, topics).

## Resultado esperado

SYGOS 3.0 queda validado funcionalmente de extremo a extremo, con integraciones reales, errores recuperables, separación multiempresa y documentación coherente con el Discovery final.

---

# Estado de validación — staging (2026-09-29)

**URL:** https://sygos.vector-ia.mx  
**Evidencia detallada:** `docs/VALIDACION_BROWSER_STAGING.md`, `docs/E2E_BROWSER_RUN_2026-09-29.md`, `docs/UAT_PLAN_CIERRE_STAGING.json`  
**Automatización:** `scripts/uat-browser-full.mjs`, `scripts/uat-plan-cierre-staging.mjs`

## Resumen ejecutivo

| Ámbito | Estado |
|--------|--------|
| Fases 1–4, 6–8 (operación, técnica, comercial, compras, RRHH, paneles) | **Validado** en staging (E2E + roles demo + barrido browser) |
| Fase 5 y 9 (fiscal/comercial **sin emisión externa**) | **Validado**: registros, CxC/CxP, pagos por validar, interco SM→SY + pago parcial SY→SM, remisiones, solicitudes, reintento timbrado **sin UUID** |
| Fase 9 recorridos E2E | **7/7** operativos (incl. interco fiscal/pago sin CFDI) |
| **Único alcance pendiente** | **Generación y envío de comprobantes/documentos hacia fuera del ERP** (ver abajo) |

## Pendiente exclusivo — emisión / envío de comprobantes

No se considera bloqueo de cierre operativo; requiere credenciales y sandbox/producción controlada:

1. **CFDI timbrado exitoso** vía Facturapi (UUID fiscal, XML/PDF oficial generado por el proveedor).
2. **Envío de correo** con comprobantes o notificaciones (SendGrid u otro).
3. **WhatsApp** u otros canales de entrega de documentos.
4. **Nómina:** timbrado exitoso de recibos (misma regla que Facturapi; en UI solo se validó fallo + reintento sin duplicar).

Todo lo demás del plan (captura, autorización, saldos, intercompañía contable, remisiones en sistema, cotización → factura en borrador, política “guardado sin timbrar”, etc.) **sí fue comprobado** en staging.

## Cierre Fase 9 — recorridos

| Recorrido | Estado staging |
|-----------|----------------|
| SYSTRON EQUI | ✅ |
| Servomotores cliente directo | ✅ |
| MOT originado en SYSTRON | ✅ |
| Compra directa | ✅ |
| O.C. | ✅ |
| Facturación/pago intercompañía | ✅ (registros + pago parcial; **sin** CFDI) |
| Nómina ambas empresas | ✅ (autorización; **sin** timbrado nómina) |
| Documentación repo / Discovery | ✅ |
