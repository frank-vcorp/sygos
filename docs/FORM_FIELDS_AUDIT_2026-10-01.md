# Auditoría de formularios HTML (server actions)

**Fecha:** 2026-10-01  
**Alcance:** `src/app`, `src/components` — `<form action={serverAction}>`. No hay `method="POST"` HTTP clásico fuera de server actions.

## Resumen

| Métrica | Valor |
|---|---:|
| Formularios auditados | 115 |
| Issues (error + warning) | 4 |
| Formularios con ≥1 issue | 3 |
| Formularios OK | 112 |

### Hallazgos destacados

- **115** formularios; **101** server actions indexadas en `*actions.ts`.
- **Captura comercial** (`CommercialQuoteCaptureForm`): `formAction` enlaza `createQuoteAction`, `createSpecialCommercialQuoteAction` o `updateQuoteCommercialContextAction` (mismo esquema `parseQuoteCommercialFormData`).
- **Alta cliente** (`ClientContactsEditor`): campos `contact_{n}_name|phone|email` alineados con `parseClientContactsFromForm` (slot hidden redundante eliminado post-auditoría).
- **Alta EQUI** (`EquiNuevoForm`): campos controlados por React; conviene smoke test de submit.
- **MOT nuevo**: action ternario Systron vs Servomotores (mismos nombres de campo).
- **RRHH**: `approveOvertimeAction` sin formulario en UI.

### Tabla resumen de issues

| # | Severidad | Módulo | Archivo | Línea | Action | Problema |
|---:|---|---|---|---:|---|---|
| 68 | warning | Activos / almacén / inventario | `app/app/mot/nuevo/page.tsx` | 47 | `createMotSystronAction | createMotServomotoresAction` | Action dinámico en runtime: isSystroncreateMotSystronAction \| createMotServomotoresAction |
| 104 | warning | Cotizaciones / comercial | `components/commercial/commercial-quote-capture-form.tsx` | 112 | `createQuoteAction | createSpecialCommercialQuoteAction | updateQuoteCommercialContextAction` | Client component con inputs controlados (useState): verificar submit nativo |
| 104 | warning | Cotizaciones / comercial | `components/commercial/commercial-quote-capture-form.tsx` | 112 | `createQuoteAction | createSpecialCommercialQuoteAction | updateQuoteCommercialContextAction` | Action dinámico en runtime: createQuoteAction \| createSpecialCommercialQuoteAction \| updateQuoteCommercialContextAction |
| 112 | warning | Activos / almacén / inventario | `components/quick-create/equi-nuevo-form.tsx` | 52 | `createEquiAction` | Client component con inputs controlados (useState): verificar submit nativo |

## Activos / almacén / inventario

### 1. register Equi Entry

- **Archivo:** `app/app/almacen/page.tsx` (línea 53)
- **Handler:** `registerEquiEntryAction` (`app/app/almacen/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `equiId`, `version`

**formData leído:** `equiId`, `version`

- ok

### 2. register Equi Trial Exit

- **Archivo:** `app/app/almacen/page.tsx` (línea 63)
- **Handler:** `registerEquiTrialExitAction` (`app/app/almacen/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `equiId`, `reason`, `version`

**formData leído:** `equiId`, `reason`, `version`

- ok

### 3. register Equi Definitive Exit

- **Archivo:** `app/app/almacen/page.tsx` (línea 69)
- **Handler:** `registerEquiDefinitiveExitAction` (`app/app/almacen/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `equiId`, `note`, `version`

**formData leído:** `equiId`, `fromTrial`, `note`, `version`

- ok

### 4. register Equi Return From Trial

- **Archivo:** `app/app/almacen/page.tsx` (línea 79)
- **Handler:** `registerEquiReturnFromTrialAction` (`app/app/almacen/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `equiId`, `version`

**formData leído:** `equiId`, `version`

- ok

### 5. register Equi Definitive Exit

- **Archivo:** `app/app/almacen/page.tsx` (línea 84)
- **Handler:** `registerEquiDefinitiveExitAction` (`app/app/almacen/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `equiId`, `fromTrial`, `note`, `version`

**formData leído:** `equiId`, `fromTrial`, `note`, `version`

- ok

### 44. register Equi Entry

- **Archivo:** `app/app/equi/[id]/page.tsx` (línea 153)
- **Handler:** `registerEquiEntryAction` (`app/app/almacen/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `equiId`, `version`

**formData leído:** `equiId`, `version`

- ok

### 62. create Part

- **Archivo:** `app/app/inventario/page.tsx` (línea 37)
- **Handler:** `createPartAction` (`app/app/inventario/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `description`, `maxQuantity`, `minQuantity`, `partNumber`

**formData leído:** `description`, `maxQuantity`, `minQuantity`, `partNumber`

- ok

### 63. adjust Stock

- **Archivo:** `app/app/inventario/page.tsx` (línea 70)
- **Handler:** `adjustStockAction` (`app/app/inventario/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `delta`, `id`

**formData leído:** `delta`, `id`

- ok

### 66. confirm Mot Ingress

- **Archivo:** `app/app/mot/[id]/page.tsx` (línea 189)
- **Handler:** `confirmMotIngressAction` (`app/app/activos/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `id`, `version`

**formData leído:** `id`, `version`

- ok

### 67. add Technical Log

- **Archivo:** `app/app/mot/[id]/page.tsx` (línea 347)
- **Handler:** `addTechnicalLogAction` (`app/app/tecnica/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `body`, `motId`

**formData leído:** `attendanceId`, `body`, `motId`

- ok

### 68. is Systroncreate Mot Systron

- **Archivo:** `app/app/mot/nuevo/page.tsx` (línea 47)
- **Handler:** `createMotSystronAction | createMotServomotoresAction` (`app/app/activos/actions.ts`)
- **Estado:** warning

**Campos (`name=`):** `brand`, `clientId`, `description`, `manufacturerSerial`, `model`

**formData leído:** `brand`, `clientId`, `description`, `manufacturerSerial`, `model`

- **warning:** Action dinámico en runtime: createMotSystronAction | createMotServomotoresAction

### 69. mot Trial Exit

- **Archivo:** `app/app/mot/servomotores/page.tsx` (línea 36)
- **Handler:** `motTrialExitAction` (`app/app/activos/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `id`, `version`

**formData leído:** `id`, `note`, `version`

- ok

### 70. mot Definitive Egress

- **Archivo:** `app/app/mot/servomotores/page.tsx` (línea 41)
- **Handler:** `motDefinitiveEgressAction` (`app/app/activos/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `documentRef`, `id`, `recipient`, `version`

**formData leído:** `documentRef`, `fromTrial`, `id`, `recipient`, `version`

- ok

### 71. mot Definitive Egress

- **Archivo:** `app/app/mot/servomotores/page.tsx` (línea 59)
- **Handler:** `motDefinitiveEgressAction` (`app/app/activos/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `documentRef`, `fromTrial`, `id`, `recipient`, `version`

**formData leído:** `documentRef`, `fromTrial`, `id`, `recipient`, `version`

- ok

### 112. Alta EQUI (quick create)

- **Archivo:** `components/quick-create/equi-nuevo-form.tsx` (línea 52)
- **Handler:** `createEquiAction` (`app/app/activos/actions.ts`)
- **Estado:** warning

**Campos (`name=`):** `brand`, `clientId`, `description`, `equipmentType`, `manufacturerSerial`, `model`

**formData leído:** `brand`, `clientId`, `description`, `equipmentType`, `manufacturerSerial`, `model`

- **warning:** Client component con inputs controlados (useState): verificar submit nativo


## Compras

### 13. create Purchase

- **Archivo:** `app/app/compras/page.tsx` (línea 76)
- **Handler:** `createPurchaseAction` (`app/app/compras/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `amountMxn`, `description`

**formData leído:** `amountMxn`, `description`

- ok

### 14. create Purchase Order

- **Archivo:** `app/app/compras/page.tsx` (línea 87)
- **Handler:** `createPurchaseOrderAction` (`app/app/compras/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `amountMxn`, `description`

**formData leído:** `amountMxn`, `description`, `purchaseId`

- ok

### 15. validate Direct Purchase

- **Archivo:** `app/app/compras/page.tsx` (línea 123)
- **Handler:** `validateDirectPurchaseAction` (`app/app/compras/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `purchaseId`, `settlement`, `supplierId`

**formData leído:** `purchaseId`, `settlement`, `supplierId`

- ok

### 16. edit Direct Purchase

- **Archivo:** `app/app/compras/page.tsx` (línea 135)
- **Handler:** `editDirectPurchaseAction` (`app/app/compras/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `amountMxn`, `description`, `purchaseId`

**formData leído:** `amountMxn`, `description`, `purchaseId`

- ok

### 17. cancel Direct Purchase

- **Archivo:** `app/app/compras/page.tsx` (línea 141)
- **Handler:** `cancelDirectPurchaseAction` (`app/app/compras/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `purchaseId`

**formData leído:** `purchaseId`

- ok

### 18. create Purchase Order

- **Archivo:** `app/app/compras/page.tsx` (línea 146)
- **Handler:** `createPurchaseOrderAction` (`app/app/compras/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `amountMxn`, `description`, `purchaseId`

**formData leído:** `amountMxn`, `description`, `purchaseId`

- ok

### 19. authorize Purchase Order

- **Archivo:** `app/app/compras/page.tsx` (línea 187)
- **Handler:** `authorizePurchaseOrderAction` (`app/app/compras/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `purchaseOrderId`

**formData leído:** `purchaseOrderId`

- ok

### 20. process Purchase Order

- **Archivo:** `app/app/compras/page.tsx` (línea 193)
- **Handler:** `processPurchaseOrderAction` (`app/app/compras/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `purchaseOrderId`, `settlement`, `supplierId`

**formData leído:** `purchaseOrderId`, `settlement`, `supplierId`

- ok

### 21. edit Purchase Order

- **Archivo:** `app/app/compras/page.tsx` (línea 206)
- **Handler:** `editPurchaseOrderAction` (`app/app/compras/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `amountMxn`, `description`, `purchaseOrderId`

**formData leído:** `amountMxn`, `description`, `purchaseOrderId`

- ok

### 22. cancel Purchase Order

- **Archivo:** `app/app/compras/page.tsx` (línea 214)
- **Handler:** `cancelPurchaseOrderAction` (`app/app/compras/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `cancelReason`, `purchaseOrderId`

**formData leído:** `cancelReason`, `purchaseOrderId`

- ok

### 72. authorize Purchase Order

- **Archivo:** `app/app/paneles/ceo/page.tsx` (línea 50)
- **Handler:** `authorizePurchaseOrderAction` (`app/app/compras/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `purchaseOrderId`

**formData leído:** `purchaseOrderId`

- ok


## Configuración

### 23. remove Company Logo

- **Archivo:** `app/app/configuracion/page.tsx` (línea 49)
- **Handler:** `removeCompanyLogoAction` (`(sin FormData)`)
- **Estado:** ok

**Campos (`name=`):** _(ninguno)_

**formData leído:** _(sin FormData)_

- ok

### 24. upload Company Logo

- **Archivo:** `app/app/configuracion/page.tsx` (línea 58)
- **Handler:** `uploadCompanyLogoAction` (`app/app/configuracion/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `logo`

**formData leído:** `logo`

- ok

### 25. update Fiscal Settings

- **Archivo:** `app/app/configuracion/page.tsx` (línea 68)
- **Handler:** `updateFiscalSettingsAction` (`app/app/configuracion/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `fiscalLegalName`, `fiscalRfc`, `maxDirectPurchaseMxn`, `monthlyPurchaseBudgetMxn`

**formData leído:** `fiscalLegalName`, `fiscalRfc`, `maxDirectPurchaseMxn`, `monthlyPurchaseBudgetMxn`

- ok

### 26. toggle Test Mode

- **Archivo:** `app/app/configuracion/page.tsx` (línea 107)
- **Handler:** `toggleTestModeAction` (`app/app/configuracion/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `enabled`

**formData leído:** `enabled`

- ok

### 27. end Test Session

- **Archivo:** `app/app/configuracion/page.tsx` (línea 121)
- **Handler:** `endTestSessionAction` (`(sin FormData)`)
- **Estado:** ok

**Campos (`name=`):** _(ninguno)_

**formData leído:** _(sin FormData)_

- ok

### 28. start Test Session

- **Archivo:** `app/app/configuracion/page.tsx` (línea 126)
- **Handler:** `startTestSessionAction` (`app/app/configuracion/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `userIds`

**formData leído:** `userIds`

- ok

### 29. toggle Servomotores Inventory

- **Archivo:** `app/app/configuracion/page.tsx` (línea 142)
- **Handler:** `toggleServomotoresInventoryAction` (`app/app/inventario/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `enabled`

**formData leído:** `enabled`

- ok


## Cotizaciones / comercial

### 30. set Quote Price

- **Archivo:** `app/app/cotizaciones/[id]/page.tsx` (línea 488)
- **Handler:** `setQuotePriceAction` (`app/app/cotizaciones/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `priceMxn`, `quoteId`, `systronSupplierCostMxn`

**formData leído:** `priceMxn`, `quoteId`, `systronSupplierCostMxn`

- ok

### 31. apply Quote Discount

- **Archivo:** `app/app/cotizaciones/[id]/page.tsx` (línea 507)
- **Handler:** `applyQuoteDiscountAction` (`app/app/cotizaciones/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `discountPercent`, `quoteId`

**formData leído:** `discountPercent`, `quoteId`

- ok

### 32. authorize Without Equipment

- **Archivo:** `app/app/cotizaciones/[id]/page.tsx` (línea 526)
- **Handler:** `authorizeWithoutEquipmentAction` (`app/app/cotizaciones/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `quoteId`

**formData leído:** `quoteId`

- ok

### 33. record Quote Client Decision

- **Archivo:** `app/app/cotizaciones/[id]/page.tsx` (línea 543)
- **Handler:** `recordQuoteClientDecisionAction` (`app/app/cotizaciones/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `decision`, `quoteId`

**formData leído:** `decision`, `quoteId`

- ok

### 34. record Quote Client Decision

- **Archivo:** `app/app/cotizaciones/[id]/page.tsx` (línea 548)
- **Handler:** `recordQuoteClientDecisionAction` (`app/app/cotizaciones/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `decision`, `quoteId`

**formData leído:** `decision`, `quoteId`

- ok

### 35. request Document

- **Archivo:** `app/app/cotizaciones/[id]/page.tsx` (línea 639)
- **Handler:** `requestDocumentAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `clientId`, `quoteId`, `requestType`

**formData leído:** `clientId`, `quoteId`, `requestType`

- ok

### 36. request Document

- **Archivo:** `app/app/cotizaciones/[id]/page.tsx` (línea 649)
- **Handler:** `requestDocumentAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `clientId`, `quoteId`, `requestType`

**formData leído:** `clientId`, `quoteId`, `requestType`

- ok

### 37. create Invoice

- **Archivo:** `app/app/cotizaciones/[id]/page.tsx` (línea 659)
- **Handler:** `createInvoiceAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `clientId`, `contractTotalMxn`, `quoteId`, `totalMxn`

**formData leído:** `clientId`, `contractTotalMxn`, `isFreeInvoice`, `quoteId`, `totalMxn`

- ok

### 38. create Remission

- **Archivo:** `app/app/cotizaciones/[id]/page.tsx` (línea 670)
- **Handler:** `createRemissionAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `allowsExit`, `clientId`, `quoteId`, `totalMxn`

**formData leído:** `allowsExit`, `clientId`, `quoteId`, `totalMxn`

- ok

### 39. send Quote

- **Archivo:** `app/app/cotizaciones/[id]/page.tsx` (línea 705)
- **Handler:** `sendQuoteAction` (`app/app/cotizaciones/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `quoteId`, `sendEmail`

**formData leído:** `contactIds`, `quoteId`, `sendEmail`, `sendWhatsapp`

- ok

### 40. add Client Contact

- **Archivo:** `app/app/cotizaciones/[id]/page.tsx` (línea 714)
- **Handler:** `addClientContactAction` (`app/app/maestros/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `clientId`, `email`, `makePrimary`, `name`, `phone`, `returnTo`

**formData leído:** `clientId`, `email`, `makePrimary`, `name`, `phone`, `preserve_*`, `returnTo`, `roleTitle`

- ok

### 41. add Client Contact

- **Archivo:** `app/app/cotizaciones/[id]/page.tsx` (línea 737)
- **Handler:** `addClientContactAction` (`app/app/maestros/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `clientId`, `email`, `name`, `phone`, `returnTo`

**formData leído:** `clientId`, `email`, `makePrimary`, `name`, `phone`, `preserve_*`, `returnTo`, `roleTitle`

- ok

### 42. send Quote

- **Archivo:** `app/app/cotizaciones/[id]/page.tsx` (línea 751)
- **Handler:** `sendQuoteAction` (`app/app/cotizaciones/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `contactIds`, `quoteId`, `sendEmail`, `sendWhatsapp`

**formData leído:** `contactIds`, `quoteId`, `sendEmail`, `sendWhatsapp`

- ok

### 104. Nueva cotización comercial

- **Archivo:** `components/commercial/commercial-quote-capture-form.tsx` (línea 112)
- **Handler:** `createQuoteAction | createSpecialCommercialQuoteAction | updateQuoteCommercialContextAction` (`app/app/cotizaciones/actions.ts`)
- **Estado:** warning

**Campos (`name=`):** `clientId`, `commercialNotes`, `commercialReference`, `equiId`, `equipmentMode`, `intendedContactIds`, `lineDescription`, `lineKind`, `lineQuantity`, `motId`, `offerType`, `pendingOrigin`, `preliminaryBrand`, `preliminaryModel`, `preliminaryNotes`, `preliminarySerial`, `quoteId`

**formData leído:** `clientId`, `commercialNotes`, `commercialReference`, `equiId`, `equipmentMode`, `intendedContactIds`, `lineDescription`, `lineKind`, `lineQuantity`, `motId`, `offerType`, `origin`, `pendingOrigin`, `preliminaryBrand`, `preliminaryModel`, `preliminaryNotes`, `preliminarySerial`, `quoteId`

- **warning:** Client component con inputs controlados (useState): verificar submit nativo
- **warning:** Action dinámico en runtime: createQuoteAction | createSpecialCommercialQuoteAction | updateQuoteCommercialContextAction


## Finanzas

### 45. register Pending Receipt

- **Archivo:** `app/app/finanzas/comprobaciones/page.tsx` (línea 31)
- **Handler:** `registerPendingReceiptAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `amountMxn`, `supplierId`

**formData leído:** `amountMxn`, `supplierId`

- ok

### 46. regularize Pending Receipt

- **Archivo:** `app/app/finanzas/comprobaciones/page.tsx` (línea 50)
- **Handler:** `regularizePendingReceiptAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `invoiceId`, `receiptId`

**formData leído:** `invoiceId`, `receiptId`

- ok

### 47. retry Stamp

- **Archivo:** `app/app/finanzas/facturas/[id]/page.tsx` (línea 161)
- **Handler:** `retryStampAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `invoiceId`

**formData leído:** `invoiceId`

- ok

### 48. validate Payment

- **Archivo:** `app/app/finanzas/facturas/[id]/page.tsx` (línea 184)
- **Handler:** `validatePaymentAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `paymentId`

**formData leído:** `paymentId`

- ok

### 49. register Payment

- **Archivo:** `app/app/finanzas/facturas/[id]/page.tsx` (línea 197)
- **Handler:** `registerPaymentAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `amountMxn`, `invoiceId`

**formData leído:** `amountMxn`, `invoiceId`

- ok

### 50. request Document

- **Archivo:** `app/app/finanzas/page.tsx` (línea 141)
- **Handler:** `requestDocumentAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `clientId`, `requestType`

**formData leído:** `clientId`, `quoteId`, `requestType`

- ok

### 51. create Invoice

- **Archivo:** `app/app/finanzas/page.tsx` (línea 186)
- **Handler:** `createInvoiceAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `clientId`, `contractTotalMxn`, `totalMxn`

**formData leído:** `clientId`, `contractTotalMxn`, `isFreeInvoice`, `quoteId`, `totalMxn`

- ok

### 52. create Remission

- **Archivo:** `app/app/finanzas/page.tsx` (línea 205)
- **Handler:** `createRemissionAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `allowsExit`, `clientId`, `totalMxn`

**formData leído:** `allowsExit`, `clientId`, `quoteId`, `totalMxn`

- ok

### 53. create Free Invoice

- **Archivo:** `app/app/finanzas/page.tsx` (línea 223)
- **Handler:** `createFreeInvoiceAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `clientId`, `totalMxn`

**formData leído:** `clientId`, `totalMxn`

- ok

### 54. intercompany Invoice

- **Archivo:** `app/app/finanzas/page.tsx` (línea 240)
- **Handler:** `intercompanyInvoiceAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `amountMxn`

**formData leído:** `amountMxn`

- ok

### 55. intercompany Payment

- **Archivo:** `app/app/finanzas/page.tsx` (línea 250)
- **Handler:** `intercompanyPaymentAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `amountMxn`

**formData leído:** `amountMxn`

- ok

### 56. add Customer Credit

- **Archivo:** `app/app/finanzas/page.tsx` (línea 259)
- **Handler:** `addCustomerCreditAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `amountMxn`, `clientId`

**formData leído:** `amountMxn`, `clientId`

- ok

### 57. apply Customer Credit

- **Archivo:** `app/app/finanzas/page.tsx` (línea 272)
- **Handler:** `applyCustomerCreditAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `amountMxn`, `clientId`, `invoiceId`

**formData leído:** `amountMxn`, `clientId`, `invoiceId`

- ok

### 58. retry Stamp

- **Archivo:** `app/app/finanzas/page.tsx` (línea 344)
- **Handler:** `retryStampAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `invoiceId`

**formData leído:** `invoiceId`

- ok

### 59. register Payment

- **Archivo:** `app/app/finanzas/page.tsx` (línea 352)
- **Handler:** `registerPaymentAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `amountMxn`, `invoiceId`

**formData leído:** `amountMxn`, `invoiceId`

- ok

### 60. validate Payment

- **Archivo:** `app/app/finanzas/page.tsx` (línea 375)
- **Handler:** `validatePaymentAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `paymentId`

**formData leído:** `paymentId`

- ok

### 61. create Invoice

- **Archivo:** `app/app/finanzas/remisiones/[id]/page.tsx` (línea 144)
- **Handler:** `createInvoiceAction` (`app/app/finanzas/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `clientId`, `contractTotalMxn`, `quoteId`, `totalMxn`

**formData leído:** `clientId`, `contractTotalMxn`, `isFreeInvoice`, `quoteId`, `totalMxn`

- ok


## Login / sesión

### 103. Iniciar sesión

- **Archivo:** `app/login/page.tsx` (línea 61)
- **Handler:** `loginAction` (`app/login/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `password`, `username`

**formData leído:** `password`, `username`

- ok


## Maestros (clientes, prospectos, proveedores)

### 6. update Client

- **Archivo:** `app/app/clientes/[id]/page.tsx` (línea 403)
- **Handler:** `updateClientAction` (`app/app/maestros/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `creditDays`, `id`, `name`, `requiresInvoice`, `shippingAddress`, `taxIdentity`, `version`

**formData leído:** `creditDays`, `id`, `name`, `requiresInvoice`, `shippingAddress`, `taxIdentity`, `version`

- ok

### 7. cancel Client

- **Archivo:** `app/app/clientes/[id]/page.tsx` (línea 451)
- **Handler:** `cancelClientAction` (`app/app/maestros/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `id`, `reason`, `version`

**formData leído:** `id`, `reason`, `version`

- ok

### 8. set Primary Client Contact

- **Archivo:** `app/app/clientes/[id]/page.tsx` (línea 483)
- **Handler:** `setPrimaryClientContactAction` (`app/app/maestros/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `clientId`, `contactId`

**formData leído:** `clientId`, `contactId`

- ok

### 9. remove Client Contact

- **Archivo:** `app/app/clientes/[id]/page.tsx` (línea 497)
- **Handler:** `removeClientContactAction` (`app/app/maestros/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `clientId`, `contactId`

**formData leído:** `clientId`, `contactId`

- ok

### 10. add Client Contact

- **Archivo:** `app/app/clientes/[id]/page.tsx` (línea 510)
- **Handler:** `addClientContactAction` (`app/app/maestros/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `clientId`, `email`, `makePrimary`, `name`, `phone`, `roleTitle`

**formData leído:** `clientId`, `email`, `makePrimary`, `name`, `phone`, `preserve_*`, `returnTo`, `roleTitle`

- ok

### 11. log Client Communication

- **Archivo:** `app/app/clientes/[id]/page.tsx` (línea 546)
- **Handler:** `logClientCommunicationAction` (`app/app/maestros/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `body`, `clientId`, `contactIds`, `sendEmail`, `sendWhatsapp`, `subject`

**formData leído:** `body`, `clientId`, `contactIds`, `sendEmail`, `sendWhatsapp`, `subject`

- ok

### 12. Alta de cliente

- **Archivo:** `app/app/clientes/nuevo/page.tsx` (línea 86)
- **Handler:** `createClientAction` (`app/app/maestros/actions.ts`)
- **Estado:** warning

**Campos (`name=`):** `confirmDuplicate`, `contact_*_email`, `contact_*_name`, `contact_*_phone`, `contact_*_slot`, `creditDays`, `name`, `preserve_*`, `primaryContactSlot`, `requiresInvoice`, `returnTo`, `shippingAddress`, `taxIdentity`

**formData leído:** `confirmDuplicate`, `contact_*_email`, `contact_*_name`, `contact_*_phone`, `creditDays`, `name`, `preserve_*`, `primaryContactSlot`, `requiresInvoice`, `returnTo`, `shippingAddress`, `taxIdentity`

- **warning:** Campo `contact_*_slot` enviado pero no leído por el action

### 73. convert Prospect To Client

- **Archivo:** `app/app/prospectos/[id]/page.tsx` (línea 93)
- **Handler:** `convertProspectToClientAction` (`app/app/maestros/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `confirmDuplicate`, `id`, `version`

**formData leído:** `confirmDuplicate`, `id`, `version`

- ok

### 74. update Prospect

- **Archivo:** `app/app/prospectos/[id]/page.tsx` (línea 106)
- **Handler:** `updateProspectAction` (`app/app/maestros/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `id`, `name`, `note`, `source`, `version`

**formData leído:** `id`, `name`, `note`, `source`, `version`

- ok

### 75. cancel Prospect

- **Archivo:** `app/app/prospectos/[id]/page.tsx` (línea 142)
- **Handler:** `cancelProspectAction` (`app/app/maestros/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `id`, `reason`, `version`

**formData leído:** `id`, `reason`, `version`

- ok

### 76. create Prospect

- **Archivo:** `app/app/prospectos/nuevo/page.tsx` (línea 23)
- **Handler:** `createProspectAction` (`app/app/maestros/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `name`, `note`, `source`

**formData leído:** `name`, `note`, `source`

- ok

### 77. update Supplier

- **Archivo:** `app/app/proveedores/[id]/page.tsx` (línea 48)
- **Handler:** `updateSupplierAction` (`app/app/maestros/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `contactName`, `email`, `id`, `name`, `phone`, `version`

**formData leído:** `contactName`, `creditDays`, `email`, `emitsFiscalInvoice`, `id`, `name`, `phone`, `version`

- ok

### 78. cancel Supplier

- **Archivo:** `app/app/proveedores/[id]/page.tsx` (línea 71)
- **Handler:** `cancelSupplierAction` (`app/app/maestros/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `id`, `reason`, `version`

**formData leído:** `id`, `reason`, `version`

- ok

### 79. create Supplier

- **Archivo:** `app/app/proveedores/nuevo/page.tsx` (línea 71)
- **Handler:** `createSupplierAction` (`app/app/maestros/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `confirmDuplicate`, `contactName`, `creditDays`, `email`, `name`, `phone`, `returnTo`

**formData leído:** `confirmDuplicate`, `contactName`, `creditDays`, `email`, `emitsFiscalInvoice`, `name`, `phone`, `preserve_*`, `returnTo`

- ok


## Otros

### 106. save Facturapi Config

- **Archivo:** `components/integrations/facturapi-config-form.tsx` (línea 14)
- **Handler:** `saveFacturapiConfigAction` (`app/app/integraciones/facturapi-actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `apiKey`, `organizationId`

**formData leído:** `apiKey`, `organizationId`

- ok

### 107. test Facturapi Config

- **Archivo:** `components/integrations/facturapi-config-form.tsx` (línea 42)
- **Handler:** `testFacturapiConfigAction` (`(sin FormData)`)
- **Estado:** ok

**Campos (`name=`):** _(ninguno)_

**formData leído:** _(sin FormData)_

- ok

### 108. save Send Grid Config

- **Archivo:** `components/integrations/sendgrid-config-form.tsx` (línea 16)
- **Handler:** `saveSendGridConfigAction` (`app/app/integraciones/sendgrid-actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `apiKey`, `fromEmail`, `fromName`

**formData leído:** `apiKey`, `fromEmail`, `fromName`

- ok

### 109. test Send Grid Config

- **Archivo:** `components/integrations/sendgrid-config-form.tsx` (línea 51)
- **Handler:** `testSendGridConfigAction` (`(sin FormData)`)
- **Estado:** ok

**Campos (`name=`):** _(ninguno)_

**formData leído:** _(sin FormData)_

- ok

### 110. start Whats App Pairing

- **Archivo:** `components/integrations/whatsapp-config-panel.tsx` (línea 39)
- **Handler:** `startWhatsAppPairingAction` (`(sin FormData)`)
- **Estado:** ok

**Campos (`name=`):** _(ninguno)_

**formData leído:** _(sin FormData)_

- ok

### 111. disconnect Whats App

- **Archivo:** `components/integrations/whatsapp-config-panel.tsx` (línea 48)
- **Handler:** `disconnectWhatsAppAction` (`(sin FormData)`)
- **Estado:** ok

**Campos (`name=`):** _(ninguno)_

**formData leído:** _(sin FormData)_

- ok


## RRHH / kiosco

### 64. kiosk Punch

- **Archivo:** `app/app/kiosco/page.tsx` (línea 31)
- **Handler:** `kioskPunchAction` (`app/app/rrhh/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `direction`, `employeeId`

**formData leído:** `direction`, `employeeId`

- ok

### 65. kiosk Punch

- **Archivo:** `app/app/kiosco/page.tsx` (línea 36)
- **Handler:** `kioskPunchAction` (`app/app/rrhh/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `direction`, `employeeId`

**formData leído:** `direction`, `employeeId`

- ok

### 80. create Employee

- **Archivo:** `app/app/rrhh/page.tsx` (línea 65)
- **Handler:** `createEmployeeAction` (`app/app/rrhh/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `employeeNumber`, `fixedSalaryOnly`, `fullName`, `kioskEligible`, `salaryCashMxn`, `salaryStampedMxn`

**formData leído:** `employeeNumber`, `fixedSalaryOnly`, `fullName`, `kioskEligible`, `managerId`, `salaryCashMxn`, `salaryStampedMxn`

- ok

### 81. request Vacation

- **Archivo:** `app/app/rrhh/page.tsx` (línea 129)
- **Handler:** `requestVacationAction` (`app/app/rrhh/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `employeeId`, `endDate`, `startDate`

**formData leído:** `employeeId`, `endDate`, `startDate`

- ok

### 82. approve Vacation

- **Archivo:** `app/app/rrhh/page.tsx` (línea 156)
- **Handler:** `approveVacationAction` (`app/app/rrhh/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `vacationId`

**formData leído:** `vacationId`

- ok

### 83. request Overtime

- **Archivo:** `app/app/rrhh/page.tsx` (línea 167)
- **Handler:** `requestOvertimeAction` (`app/app/rrhh/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `employeeId`, `hours`

**formData leído:** `employeeId`, `hours`

- ok

### 84. create Weekly Payroll

- **Archivo:** `app/app/rrhh/page.tsx` (línea 184)
- **Handler:** `createWeeklyPayrollAction` (`app/app/rrhh/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `weekKey`

**formData leído:** `weekKey`

- ok

### 85. authorize Payroll

- **Archivo:** `app/app/rrhh/page.tsx` (línea 197)
- **Handler:** `authorizePayrollAction` (`app/app/rrhh/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `payrollRunId`

**formData leído:** `payrollRunId`

- ok

### 86. retry Payroll Stamp

- **Archivo:** `app/app/rrhh/page.tsx` (línea 205)
- **Handler:** `retryPayrollStampAction` (`app/app/rrhh/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `payrollRunId`

**formData leído:** `payrollRunId`

- ok


## Técnica

### 87. advance Diagnosis Status

- **Archivo:** `app/app/tecnica/[id]/page.tsx` (línea 269)
- **Handler:** `advanceDiagnosisStatusAction` (`app/app/tecnica/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `diagnosisId`, `target`

**formData leído:** `diagnosisId`, `target`

- ok

### 88. advance Diagnosis Status

- **Archivo:** `app/app/tecnica/[id]/page.tsx` (línea 276)
- **Handler:** `advanceDiagnosisStatusAction` (`app/app/tecnica/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `diagnosisId`, `target`

**formData leído:** `diagnosisId`, `target`

- ok

### 89. validate Diagnosis

- **Archivo:** `app/app/tecnica/[id]/page.tsx` (línea 283)
- **Handler:** `validateDiagnosisAction` (`app/app/tecnica/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `diagnosisId`

**formData leído:** `diagnosisId`

- ok

### 90. return Diagnosis

- **Archivo:** `app/app/tecnica/[id]/page.tsx` (línea 291)
- **Handler:** `returnDiagnosisAction` (`app/app/tecnica/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `diagnosisId`, `instruction`, `reason`

**formData leído:** `diagnosisId`, `instruction`, `reason`

- ok

### 91. resolve Warranty

- **Archivo:** `app/app/tecnica/[id]/page.tsx` (línea 309)
- **Handler:** `resolveWarrantyAction` (`app/app/tecnica/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `diagnosisId`, `outcome`

**formData leído:** `diagnosisId`, `outcome`

- ok

### 92. resolve Warranty

- **Archivo:** `app/app/tecnica/[id]/page.tsx` (línea 314)
- **Handler:** `resolveWarrantyAction` (`app/app/tecnica/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `diagnosisId`, `outcome`

**formData leído:** `diagnosisId`, `outcome`

- ok

### 93. ceo Override Warranty

- **Archivo:** `app/app/tecnica/[id]/page.tsx` (línea 322)
- **Handler:** `ceoOverrideWarrantyAction` (`app/app/tecnica/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `diagnosisId`

**formData leído:** `diagnosisId`

- ok

### 94. update Repair Status

- **Archivo:** `app/app/tecnica/[id]/page.tsx` (línea 368)
- **Handler:** `updateRepairStatusAction` (`app/app/tecnica/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `repairId`, `status`

**formData leído:** `repairId`, `status`

- ok

### 95. create Service Order

- **Archivo:** `app/app/tecnica/[id]/page.tsx` (línea 383)
- **Handler:** `createServiceOrderAction` (`app/app/tecnica/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `attendanceId`

**formData leído:** `attendanceId`

- ok

### 96. register External Service Inbound

- **Archivo:** `app/app/tecnica/[id]/page.tsx` (línea 397)
- **Handler:** `registerExternalServiceInboundAction` (`app/app/tecnica/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `caseId`, `note`

**formData leído:** `caseId`, `note`

- ok

### 97. register External Service Outbound

- **Archivo:** `app/app/tecnica/[id]/page.tsx` (línea 406)
- **Handler:** `registerExternalServiceOutboundAction` (`app/app/tecnica/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `attendanceId`, `note`, `supplierId`

**formData leído:** `attendanceId`, `note`, `supplierId`

- ok

### 98. add Technical Log

- **Archivo:** `app/app/tecnica/[id]/page.tsx` (línea 447)
- **Handler:** `addTechnicalLogAction` (`app/app/tecnica/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `attendanceId`, `body`, `motId`

**formData leído:** `attendanceId`, `body`, `motId`

- ok

### 99. create Attendance

- **Archivo:** `app/app/tecnica/nueva/page.tsx` (línea 87)
- **Handler:** `createAttendanceAction` (`app/app/tecnica/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `attentionType`, `equiId`, `motId`, `priority`, `repairPriority`, `reportedFault`

**formData leído:** `attentionType`, `equiId`, `motId`, `priority`, `repairPriority`, `reportedFault`

- ok


## Usuarios / cuenta / sesión app

### 43. change Password

- **Archivo:** `app/app/cuenta/page.tsx` (línea 58)
- **Handler:** `changePasswordAction` (`app/app/cuenta/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `confirmPassword`, `currentPassword`, `newPassword`

**formData leído:** `confirmPassword`, `currentPassword`, `newPassword`

- ok

### 100. create User

- **Archivo:** `app/app/usuarios/page.tsx` (línea 38)
- **Handler:** `createUserAction` (`app/app/usuarios/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `displayName`, `homeCompanyCode`, `maxDiscountPercent`, `password`, `role`, `username`

**formData leído:** `displayName`, `homeCompanyCode`, `maxDiscountPercent`, `password`, `role`, `username`

- ok

### 101. update User

- **Archivo:** `app/app/usuarios/page.tsx` (línea 87)
- **Handler:** `updateUserAction` (`app/app/usuarios/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `displayName`, `id`, `maxDiscountPercent`

**formData leído:** `displayName`, `id`, `maxDiscountPercent`

- ok

### 102. deactivate User

- **Archivo:** `app/app/usuarios/page.tsx` (línea 105)
- **Handler:** `deactivateUserAction` (`app/app/usuarios/actions.ts`)
- **Estado:** ok

**Campos (`name=`):** `id`

**formData leído:** `id`

- ok

### 105. Cambiar empresa activa

- **Archivo:** `components/company-switcher.tsx` (línea 20)
- **Handler:** `switchCompanyAction` (`(sin FormData)`)
- **Estado:** ok

**Campos (`name=`):** _(ninguno)_

**formData leído:** _(sin FormData)_

- ok

### 113. Cerrar sesión

- **Archivo:** `components/shell/app-shell.tsx` (línea 148)
- **Handler:** `logoutAction` (`(sin FormData)`)
- **Estado:** ok

**Campos (`name=`):** _(ninguno)_

**formData leído:** _(sin FormData)_

- ok

### 114. Cerrar sesión

- **Archivo:** `components/shell/app-shell.tsx` (línea 269)
- **Handler:** `logoutAction` (`(sin FormData)`)
- **Estado:** ok

**Campos (`name=`):** _(ninguno)_

**formData leído:** _(sin FormData)_

- ok

### 115. Terminar modo “ver como”

- **Archivo:** `components/view-as-banner.tsx` (línea 18)
- **Handler:** `clearViewAsAction` (`(sin FormData)`)
- **Estado:** ok

**Campos (`name=`):** _(ninguno)_

**formData leído:** _(sin FormData)_

- ok


---

_Generado 2026-10-01. Formularios: **115**. Issues: **5**._
