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
  "EGRESADO",
]);

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
