import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
  integer,
} from "drizzle-orm/pg-core";

export const companyCodeEnum = pgEnum("company_code", ["SYSTRON", "SERVOMOTORES"]);

export const roleEnum = pgEnum("user_role", [
  "ADMINISTRADOR",
  "CEO",
  "COORDINACION_ADMIN",
  "GERENTE_OPERATIVO_SYSTRON",
  "GERENTE_OPERATIVO_SERVOMOTORES",
  "SUPERVISOR_TECNICO_SYSTRON",
  "TECNICO_SYSTRON",
  "VENTAS_SYSTRON",
  "ALMACEN_SYSTRON",
  "AYUDANTE_GENERAL_SERVOMOTORES",
  "KIOSCO_ASISTENCIA",
]);

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: companyCodeEnum("code").notNull().unique(),
  legalName: text("legal_name").notNull(),
  displayName: text("display_name").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    role: roleEnum("role").notNull(),
    /** Empresa “home” para usuarios de una sola empresa; null si solo multi-empresa */
    homeCompanyId: uuid("home_company_id").references(() => companies.id),
    /** Límite de descuento comercial (%); aplica a VENTAS_SYSTRON */
    maxDiscountPercent: integer("max_discount_percent"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_username_unique").on(t.username)],
);

/** CEO, Coordinación y Administrador: acceso explícito a empresas */
export const userCompanyAccess = pgTable(
  "user_company_access",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("user_company_access_unique").on(t.userId, t.companyId),
    index("user_company_access_user_idx").on(t.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    activeCompanyId: uuid("active_company_id")
      .notNull()
      .references(() => companies.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
  ],
);

export const folioScopeEnum = pgEnum("folio_scope", ["COMPANY", "GLOBAL_MOT"]);

export const folioSequences = pgTable(
  "folio_sequences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scope: folioScopeEnum("scope").notNull(),
    companyId: uuid("company_id").references(() => companies.id),
    key: text("key").notNull(),
    lastValue: text("last_value").notNull().default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("folio_sequences_unique").on(t.scope, t.companyId, t.key),
    index("folio_sequences_company_idx").on(t.companyId),
  ],
);

export const clientClassificationEnum = pgEnum("client_classification", ["NORMAL", "PREMIUM"]);

export const masterEntityEnum = pgEnum("master_entity", ["CLIENT", "PROSPECT", "SUPPLIER"]);
export const masterEventTypeEnum = pgEnum("master_event_type", ["UPDATED", "CANCELLED"]);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    folio: text("folio"),
    name: text("name").notNull(),
    classification: clientClassificationEnum("classification").default("NORMAL"),
    responsibleUserId: uuid("responsible_user_id").references(() => users.id),
    shippingAddress: text("shipping_address"),
    taxIdentity: text("tax_identity"),
    creditDays: integer("credit_days").notNull().default(0),
    requiresInvoice: boolean("requires_invoice").notNull().default(true),
    isIntercompany: boolean("is_intercompany").notNull().default(false),
    active: boolean("active").notNull().default(true),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("clients_company_name_idx").on(t.companyId, t.name),
    index("clients_company_active_idx").on(t.companyId, t.active),
  ],
);

export const clientCommunications = pgTable(
  "client_communications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    channel: text("channel").notNull().default("GENERAL"),
    subject: text("subject"),
    body: text("body").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("client_communications_client_idx").on(t.clientId),
    index("client_communications_company_idx").on(t.companyId),
  ],
);

export const clientCommunicationRecipients = pgTable(
  "client_communication_recipients",
  {
    communicationId: uuid("communication_id")
      .notNull()
      .references(() => clientCommunications.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => clientContacts.id),
  },
  (t) => [
    uniqueIndex("client_communication_recipients_unique").on(t.communicationId, t.contactId),
  ],
);

export const clientContacts = pgTable(
  "client_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    roleTitle: text("role_title"),
    email: text("email"),
    isPrimary: boolean("is_primary").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("client_contacts_client_idx").on(t.clientId)],
);

export const prospectStatusEnum = pgEnum("prospect_status", [
  "NUEVO",
  "EN_SEGUIMIENTO",
  "CONVERTIDO",
  "DESCARTADO",
]);

export const prospects = pgTable(
  "prospects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    folio: text("folio"),
    name: text("name").notNull(),
    responsibleUserId: uuid("responsible_user_id").references(() => users.id),
    source: text("source"),
    note: text("note"),
    status: prospectStatusEnum("status").notNull().default("NUEVO"),
    convertedClientId: uuid("converted_client_id").references(() => clients.id),
    active: boolean("active").notNull().default(true),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("prospects_company_status_idx").on(t.companyId, t.status),
    index("prospects_company_name_idx").on(t.companyId, t.name),
  ],
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    folio: text("folio"),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    taxIdentity: text("tax_identity"),
    creditDays: integer("credit_days").notNull().default(0),
    emitsFiscalInvoice: boolean("emits_fiscal_invoice").notNull().default(true),
    category: text("category"),
    isIntercompany: boolean("is_intercompany").notNull().default(false),
    active: boolean("active").notNull().default(true),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("suppliers_company_name_idx").on(t.companyId, t.name),
    index("suppliers_company_active_idx").on(t.companyId, t.active),
  ],
);

export const integrationKeyEnum = pgEnum("integration_key", ["FACTURAPI", "SENDGRID", "WHATSAPP"]);

export const integrationSettings = pgTable(
  "integration_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    integration: integrationKeyEnum("integration").notNull(),
    configured: boolean("configured").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("integration_settings_company_key").on(t.companyId, t.integration)],
);

/** Credenciales cifradas por empresa e integración (no se exponen en UI). */
export const integrationSecrets = pgTable(
  "integration_secrets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    integration: integrationKeyEnum("integration").notNull(),
    ciphertext: text("ciphertext").notNull(),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("integration_secrets_company_key").on(t.companyId, t.integration)],
);

export const whatsappConnectionStatusEnum = pgEnum("whatsapp_connection_status", [
  "DISCONNECTED",
  "QR_PENDING",
  "CONNECTED",
]);

export const whatsappSessions = pgTable(
  "whatsapp_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    status: whatsappConnectionStatusEnum("status").notNull().default("DISCONNECTED"),
    linkedPhone: text("linked_phone"),
    authCiphertext: text("auth_ciphertext"),
    lastError: text("last_error"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("whatsapp_sessions_company_unique").on(t.companyId)],
);

export const documentDeliveryChannelEnum = pgEnum("document_delivery_channel", ["EMAIL", "WHATSAPP"]);

export const documentDeliveryStatusEnum = pgEnum("document_delivery_status", [
  "PENDING",
  "SENT",
  "FAILED",
]);

export const documentDeliveries = pgTable(
  "document_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    channel: documentDeliveryChannelEnum("channel").notNull(),
    status: documentDeliveryStatusEnum("status").notNull().default("PENDING"),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    contactId: uuid("contact_id").references(() => clientContacts.id),
    recipient: text("recipient").notNull(),
    subject: text("subject"),
    errorMessage: text("error_message"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("document_deliveries_company_idx").on(t.companyId),
    index("document_deliveries_entity_idx").on(t.entityType, t.entityId),
  ],
);

export const masterRecordEvents = pgTable(
  "master_record_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    entityType: masterEntityEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    eventType: masterEventTypeEnum("event_type").notNull(),
    reason: text("reason"),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("master_record_events_entity_idx").on(t.entityType, t.entityId),
    index("master_record_events_company_idx").on(t.companyId),
  ],
);

export const motCustodyStatusEnum = pgEnum("mot_custody_status", [
  "PENDIENTE_INGRESO_SERVOMOTORES",
  "EN_RESGUARDO_SERVOMOTORES",
  "SALIDA_PRUEBA",
  "EGRESADO",
]);

export const equiWarehouseStatusEnum = pgEnum("equi_warehouse_status", [
  "SIN_ENTRADA",
  "EN_RESGUARDO",
  "SALIDA_PRUEBA",
  "SALIDA_DEFINITIVA",
]);

export const attentionTypeEnum = pgEnum("attention_type", [
  "DIAGNOSTICO",
  "REPARACION",
  "DIAGNOSTICO_GARANTIA",
]);

export const diagnosisPriorityEnum = pgEnum("diagnosis_priority", ["NORMAL", "ALTA", "EXPRESS"]);

export const diagnosisStatusEnum = pgEnum("diagnosis_status", [
  "ABIERTO",
  "EN_TRABAJO",
  "TERMINADO",
  "PENDIENTE_VALIDACION_GERENTE",
  "DEVUELTO_CORRECCION",
  "VALIDADO_GERENTE",
]);

export const repairPriorityEnum = pgEnum("repair_priority", ["NORMAL", "ALTA", "EXPRESS"]);

export const repairStatusEnum = pgEnum("repair_status", [
  "EN_ESPERA",
  "EN_REPARACION",
  "EN_ESPERA_REFACCIONES",
  "REPARACION_TERMINADA",
  "SIN_REPARACION",
]);

export const warrantyOutcomeEnum = pgEnum("warranty_outcome", [
  "PENDIENTE",
  "PROCEDENTE",
  "NO_PROCEDENTE",
  "CEO_VALIDADA",
]);

export const serviceOrderStatusEnum = pgEnum("service_order_status", [
  "EN_ESPERA",
  "EN_REPARACION",
  "EN_ESPERA_REFACCIONES",
  "REPARACION_TERMINADA",
  "SIN_REPARACION",
]);

export const quoteStatusEnum = pgEnum("quote_status", [
  "BORRADOR",
  "PENDIENTE_PRECIO",
  "ENVIADA",
  "AUTORIZADA",
  "AUTORIZADA_PENDIENTE_INGRESO_EQUIPO",
  "RECHAZADA",
  "CANCELADA",
]);

export const quotePendingOriginEnum = pgEnum("quote_pending_origin", [
  "COTIZACION_INICIADA",
  "DIAGNOSTICO_VALIDADO",
  "REPARACION_PENDIENTE_PRECIO",
  "GARANTIA_NO_PROCEDENTE",
  "MOT_INTERCOMPANIA",
  "VENTA_EQUIPO",
  "SERVICIO_EN_CAMPO",
]);

export const creditNoteStatusEnum = pgEnum("credit_note_status", [
  "PENDIENTE_AUTORIZACION",
  "AUTORIZADA",
  "TIMBRADA",
  "CANCELADA",
]);

export const pendingReceiptStatusEnum = pgEnum("pending_receipt_status", ["PENDIENTE", "REGULARIZADA"]);

export const invoiceStatusEnum = pgEnum("invoice_status", ["BORRADOR", "TIMBRADA", "CANCELADA", "CANCELACION_PENDIENTE"]);

export const paymentValidationEnum = pgEnum("payment_validation", ["PENDIENTE_VALIDACION", "VALIDADO"]);

export const documentRequestTypeEnum = pgEnum("document_request_type", ["FACTURA", "REMISION"]);

export const documentRequestStatusEnum = pgEnum("document_request_status", ["SOLICITADA", "GENERADA", "CANCELADA"]);

export const purchaseStatusEnum = pgEnum("purchase_status", [
  "REGISTRADA",
  "PENDIENTE_OC",
  "AUTORIZADA",
  "VALIDADA",
  "CANCELADA",
]);

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "PENDIENTE_AUTORIZACION",
  "AUTORIZADA",
  "PROCESADA",
  "CANCELADA",
]);

export const payrollRunStatusEnum = pgEnum("payroll_run_status", ["BORRADOR", "AUTORIZADA", "TIMBRADO_FALLIDO", "CERRADA"]);

export const vacationStatusEnum = pgEnum("vacation_status", ["SOLICITADA", "AUTORIZADA", "RECHAZADA"]);

export const companySettings = pgTable(
  "company_settings",
  {
    companyId: uuid("company_id")
      .primaryKey()
      .references(() => companies.id),
    servomotoresInventoryEnabled: boolean("servomotores_inventory_enabled").notNull().default(false),
    testModeEnabled: boolean("test_mode_enabled").notNull().default(false),
    fiscalLegalName: text("fiscal_legal_name"),
    fiscalRfc: text("fiscal_rfc"),
    monthlyPurchaseBudgetMxn: integer("monthly_purchase_budget_mxn").notNull().default(5000),
    maxDirectPurchaseMxn: integer("max_direct_purchase_mxn").notNull().default(2000),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** Equipos físicos SYSTRON (no flujo MOT). */
export const equiUnits = pgTable(
  "equi_units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    folio: text("folio").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    equipmentType: text("equipment_type"),
    brand: text("brand"),
    model: text("model").notNull(),
    description: text("description"),
    manufacturerSerial: text("manufacturer_serial"),
    warehouseStatus: equiWarehouseStatusEnum("warehouse_status").notNull().default("SIN_ENTRADA"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    active: boolean("active").notNull().default(true),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("equi_units_company_folio").on(t.companyId, t.folio),
    index("equi_units_company_client_idx").on(t.companyId, t.clientId),
  ],
);

/** Motor/servomotor — folio MOT global, visibilidad según empresa origen. */
export const motUnits = pgTable(
  "mot_units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    folio: text("folio").notNull(),
    originCompanyId: uuid("origin_company_id")
      .notNull()
      .references(() => companies.id),
    originCompanyCode: companyCodeEnum("origin_company_code").notNull(),
    systronClientId: uuid("systron_client_id").references(() => clients.id),
    servomotoresClientId: uuid("servomotores_client_id").references(() => clients.id),
    systronResponsibleUserId: uuid("systron_responsible_user_id").references(() => users.id),
    brand: text("brand"),
    model: text("model").notNull(),
    description: text("description"),
    manufacturerSerial: text("manufacturer_serial"),
    custodyStatus: motCustodyStatusEnum("custody_status").notNull(),
    physicalIngressAt: timestamp("physical_ingress_at", { withTimezone: true }),
    slaDueAt: timestamp("sla_due_at", { withTimezone: true }),
    egressRecipient: text("egress_recipient"),
    egressDocumentRef: text("egress_document_ref"),
    egressAt: timestamp("egress_at", { withTimezone: true }),
    /** Salida de reparación pagada (referencia garantía 6 meses) */
    paidRepairEgressAt: timestamp("paid_repair_egress_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    active: boolean("active").notNull().default(true),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("mot_units_folio_unique").on(t.folio),
    index("mot_units_origin_idx").on(t.originCompanyId),
    index("mot_units_custody_idx").on(t.custodyStatus),
  ],
);

export const equiWarehouseEvents = pgTable(
  "equi_warehouse_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    equiId: uuid("equi_id")
      .notNull()
      .references(() => equiUnits.id, { onDelete: "cascade" }),
    fromStatus: equiWarehouseStatusEnum("from_status"),
    toStatus: equiWarehouseStatusEnum("to_status").notNull(),
    note: text("note"),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("equi_warehouse_events_equi_idx").on(t.equiId)],
);

export const motCustodyEvents = pgTable(
  "mot_custody_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    motId: uuid("mot_id")
      .notNull()
      .references(() => motUnits.id, { onDelete: "cascade" }),
    fromStatus: motCustodyStatusEnum("from_status"),
    toStatus: motCustodyStatusEnum("to_status").notNull(),
    note: text("note"),
    recipient: text("recipient"),
    documentRef: text("document_ref"),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("mot_custody_events_mot_idx").on(t.motId)],
);

export const inventoryParts = pgTable(
  "inventory_parts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    partNumber: text("part_number").notNull(),
    description: text("description").notNull(),
    quantityOnHand: integer("quantity_on_hand").notNull().default(0),
    minQuantity: integer("min_quantity"),
    maxQuantity: integer("max_quantity"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("inventory_parts_company_part").on(t.companyId, t.partNumber)],
);

export const attendances = pgTable(
  "attendances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    attentionType: attentionTypeEnum("attention_type").notNull(),
    equiId: uuid("equi_id").references(() => equiUnits.id),
    motId: uuid("mot_id").references(() => motUnits.id),
    reportedFault: text("reported_fault"),
    status: text("status").notNull().default("ABIERTA"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("attendances_company_idx").on(t.companyId),
    index("attendances_equi_idx").on(t.equiId),
    index("attendances_mot_idx").on(t.motId),
  ],
);

export const diagnoses = pgTable("diagnoses", {
  id: uuid("id").defaultRandom().primaryKey(),
  attendanceId: uuid("attendance_id")
    .notNull()
    .references(() => attendances.id),
  priority: diagnosisPriorityEnum("priority").notNull().default("NORMAL"),
  status: diagnosisStatusEnum("status").notNull().default("ABIERTO"),
  snapshotPriceMxn: integer("snapshot_price_mxn"),
  snapshotSlaDays: integer("snapshot_sla_days"),
  completedByUserId: uuid("completed_by_user_id").references(() => users.id),
  productionAttributedUserId: uuid("production_attributed_user_id").references(() => users.id),
  warrantyReferencePaidEgressAt: timestamp("warranty_reference_paid_egress_at", { withTimezone: true }),
  warrantyValidUntil: timestamp("warranty_valid_until", { withTimezone: true }),
  warrantyOutcome: warrantyOutcomeEnum("warranty_outcome").default("PENDIENTE"),
  managerValidatedAt: timestamp("manager_validated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const diagnosisCorrections = pgTable("diagnosis_corrections", {
  id: uuid("id").defaultRandom().primaryKey(),
  diagnosisId: uuid("diagnosis_id")
    .notNull()
    .references(() => diagnoses.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  instruction: text("instruction").notNull(),
  authorUserId: uuid("author_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const repairs = pgTable("repairs", {
  id: uuid("id").defaultRandom().primaryKey(),
  attendanceId: uuid("attendance_id")
    .notNull()
    .references(() => attendances.id),
  priority: repairPriorityEnum("priority").notNull().default("NORMAL"),
  snapshotIncrementPercent: integer("snapshot_increment_percent").notNull().default(0),
  snapshotSlaDays: integer("snapshot_sla_days").notNull().default(10),
  status: repairStatusEnum("status").notNull().default("EN_ESPERA"),
  completedByUserId: uuid("completed_by_user_id").references(() => users.id),
  productionAttributedUserId: uuid("production_attributed_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const externalServiceCases = pgTable("external_service_cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  attendanceId: uuid("attendance_id")
    .notNull()
    .references(() => attendances.id),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  outboundAt: timestamp("outbound_at", { withTimezone: true }),
  inboundAt: timestamp("inbound_at", { withTimezone: true }),
  outboundNote: text("outbound_note"),
  inboundNote: text("inbound_note"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const technicalProductionCredits = pgTable("technical_production_credits", {
  id: uuid("id").defaultRandom().primaryKey(),
  attendanceId: uuid("attendance_id")
    .notNull()
    .references(() => attendances.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  creditedAt: timestamp("credited_at", { withTimezone: true }).notNull().defaultNow(),
});

export const technicalLogEntries = pgTable(
  "technical_log_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    motId: uuid("mot_id").references(() => motUnits.id),
    attendanceId: uuid("attendance_id").references(() => attendances.id),
    body: text("body").notNull(),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("technical_log_mot_idx").on(t.motId)],
);

export const serviceOrders = pgTable("service_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  attendanceId: uuid("attendance_id")
    .notNull()
    .references(() => attendances.id),
  folio: text("folio").notNull(),
  status: serviceOrderStatusEnum("status").notNull().default("EN_ESPERA"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    folio: text("folio").notNull(),
    status: quoteStatusEnum("status").notNull().default("BORRADOR"),
    pendingPricing: boolean("pending_pricing").notNull().default(true),
    pendingOrigin: quotePendingOriginEnum("pending_origin").default("COTIZACION_INICIADA"),
    attendanceId: uuid("attendance_id").references(() => attendances.id),
    priceMxn: integer("price_mxn"),
    finalPriceMxn: integer("final_price_mxn"),
    discountPercent: integer("discount_percent").notNull().default(0),
    /** Costo base Servomotores (solo CEO SYSTRON en intercompañía) */
    systronSupplierCostMxn: integer("systron_supplier_cost_mxn"),
    linkedQuoteId: uuid("linked_quote_id"),
    authorizedWithoutEquipment: boolean("authorized_without_equipment").notNull().default(false),
    commercialReference: text("commercial_reference"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quotes_company_status_idx").on(t.companyId, t.status)],
);

export const quotePriceRevisions = pgTable("quote_price_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  priceMxn: integer("price_mxn").notNull(),
  authorUserId: uuid("author_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quoteSendContacts = pgTable(
  "quote_send_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => clientContacts.id),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quote_send_contacts_quote_idx").on(t.quoteId)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    quoteId: uuid("quote_id").references(() => quotes.id),
    folio: text("folio").notNull(),
    totalMxn: integer("total_mxn").notNull().default(0),
    contractTotalMxn: integer("contract_total_mxn"),
    isFreeInvoice: boolean("is_free_invoice").notNull().default(false),
    isIntercompany: boolean("is_intercompany").notNull().default(false),
    linkedApInvoiceId: uuid("linked_ap_invoice_id"),
    facturapiUuid: text("facturapi_uuid"),
    lastStampError: text("last_stamp_error"),
    requiresCashPolicy: boolean("requires_cash_policy").notNull().default(false),
    status: invoiceStatusEnum("status").notNull().default("BORRADOR"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("invoices_company_idx").on(t.companyId)],
);

export const remissions = pgTable("remissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  folio: text("folio").notNull(),
  totalMxn: integer("total_mxn").notNull().default(0),
  allowsPhysicalExit: boolean("allows_physical_exit").notNull().default(false),
  invoiceObligationRemains: boolean("invoice_obligation_remains").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentRequests = pgTable("document_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  requestType: documentRequestTypeEnum("request_type").notNull(),
  status: documentRequestStatusEnum("status").notNull().default("SOLICITADA"),
  quoteId: uuid("quote_id").references(() => quotes.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  remissionId: uuid("remission_id").references(() => remissions.id),
  requestedByUserId: uuid("requested_by_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  amountMxn: integer("amount_mxn").notNull(),
  validationStatus: paymentValidationEnum("validation_status").notNull().default("PENDIENTE_VALIDACION"),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  validatedByUserId: uuid("validated_by_user_id").references(() => users.id),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id),
});

export const customerCreditBalances = pgTable(
  "customer_credit_balances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    unappliedMxn: integer("unapplied_mxn").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("customer_credit_balances_unique").on(t.companyId, t.clientId)],
);

export const receivableBalances = pgTable("receivable_balances", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id),
  openMxn: integer("open_mxn").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payableBalances = pgTable("payable_balances", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  openMxn: integer("open_mxn").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    folio: text("folio").notNull(),
    description: text("description").notNull(),
    amountMxn: integer("amount_mxn").notNull(),
    status: purchaseOrderStatusEnum("status").notNull().default("PENDIENTE_AUTORIZACION"),
    authorizedByUserId: uuid("authorized_by_user_id").references(() => users.id),
    authorizedAmountMxn: integer("authorized_amount_mxn"),
    cancelReason: text("cancel_reason"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("purchase_orders_company_idx").on(t.companyId)],
);

export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id),
    description: text("description").notNull(),
    amountMxn: integer("amount_mxn").notNull(),
    calendarMonth: text("calendar_month").notNull(),
    status: purchaseStatusEnum("status").notNull().default("REGISTRADA"),
    requiresCeoAuth: boolean("requires_ceo_auth").notNull().default(false),
    payableBalanceId: uuid("payable_balance_id"),
    cashDisbursementId: uuid("cash_disbursement_id"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("purchases_company_idx").on(t.companyId)],
);

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    employeeNumber: text("employee_number").notNull(),
    fullName: text("full_name").notNull(),
    active: boolean("active").notNull().default(true),
    userId: uuid("user_id").references(() => users.id),
    managerId: uuid("manager_id"),
    kioskEligible: boolean("kiosk_eligible").notNull().default(true),
    fixedSalaryOnly: boolean("fixed_salary_only").notNull().default(false),
    salaryStampedMxn: integer("salary_stamped_mxn"),
    salaryCashMxn: integer("salary_cash_mxn"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("employees_company_number").on(t.companyId, t.employeeNumber)],
);

export const salaryHistoryEntries = pgTable("salary_history_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  stampedMxn: integer("stamped_mxn").notNull(),
  cashMxn: integer("cash_mxn").notNull().default(0),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
});

export const vacationRequests = pgTable("vacation_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  businessDays: integer("business_days").notNull(),
  status: vacationStatusEnum("status").notNull().default("SOLICITADA"),
  requestedByUserId: uuid("requested_by_user_id").references(() => users.id),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const overtimeRequests = pgTable("overtime_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id),
  weekKey: text("week_key").notNull(),
  hoursDouble: integer("hours_double").notNull().default(0),
  hoursTriple: integer("hours_triple").notNull().default(0),
  originatedByUserId: uuid("originated_by_user_id").references(() => users.id),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payrollRuns = pgTable(
  "payroll_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    weekKey: text("week_key").notNull(),
    status: payrollRunStatusEnum("status").notNull().default("BORRADOR"),
    stampError: text("stamp_error"),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("payroll_runs_company_week").on(t.companyId, t.weekKey)],
);

export const payrollLines = pgTable("payroll_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  payrollRunId: uuid("payroll_run_id")
    .notNull()
    .references(() => payrollRuns.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id),
  grossMxn: integer("gross_mxn").notNull(),
  vacationPremiumMxn: integer("vacation_premium_mxn").notNull().default(0),
});

export const testSessions = pgTable("test_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  startedByUserId: uuid("started_by_user_id")
    .notNull()
    .references(() => users.id),
  active: boolean("active").notNull().default(true),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const testSessionParticipants = pgTable(
  "test_session_participants",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => testSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
  },
  (t) => [uniqueIndex("test_session_participants_unique").on(t.sessionId, t.userId)],
);

export const integrationStampAttempts = pgTable("integration_stamp_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id),
  success: boolean("success").notNull(),
  externalUuid: text("external_uuid"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attendancePunches = pgTable("attendance_punches", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id),
  punchedAt: timestamp("punched_at", { withTimezone: true }).notNull().defaultNow(),
  direction: text("direction").notNull(),
});

export const cashDisbursements = pgTable("cash_disbursements", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  folio: text("folio").notNull(),
  amountMxn: integer("amount_mxn").notNull(),
  description: text("description").notNull(),
  supplierId: uuid("supplier_id").references(() => suppliers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pendingReceipts = pgTable("pending_receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  amountMxn: integer("amount_mxn").notNull(),
  status: pendingReceiptStatusEnum("status").notNull().default("PENDIENTE"),
  cashDisbursementId: uuid("cash_disbursement_id").references(() => cashDisbursements.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creditNotes = pgTable("credit_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id),
  amountMxn: integer("amount_mxn").notNull(),
  status: creditNoteStatusEnum("status").notNull().default("PENDIENTE_AUTORIZACION"),
  authorizedByUserId: uuid("authorized_by_user_id").references(() => users.id),
  facturapiUuid: text("facturapi_uuid"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const storedDocuments = pgTable(
  "stored_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    fileName: text("file_name").notNull(),
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type"),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("stored_documents_entity_idx").on(t.entityType, t.entityId)],
);

export const commissionEntries = pgTable("commission_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  quoteId: uuid("quote_id").references(() => quotes.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  amountMxn: integer("amount_mxn").notNull(),
  weekKey: text("week_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const testSessionMutations = pgTable("test_session_mutations", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => testSessions.id, { onDelete: "cascade" }),
  tableName: text("table_name").notNull(),
  rowId: uuid("row_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
