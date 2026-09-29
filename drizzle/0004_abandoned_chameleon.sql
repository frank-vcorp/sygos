CREATE TYPE "public"."attention_type" AS ENUM('DIAGNOSTICO', 'REPARACION', 'DIAGNOSTICO_GARANTIA');--> statement-breakpoint
CREATE TYPE "public"."diagnosis_priority" AS ENUM('NORMAL', 'ALTA', 'EXPRESS');--> statement-breakpoint
CREATE TYPE "public"."diagnosis_status" AS ENUM('ABIERTO', 'EN_TRABAJO', 'TERMINADO', 'DEVUELTO_CORRECCION', 'VALIDADO_GERENTE');--> statement-breakpoint
CREATE TYPE "public"."equi_warehouse_status" AS ENUM('SIN_ENTRADA', 'EN_RESGUARDO', 'SALIDA_PRUEBA', 'SALIDA_DEFINITIVA');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('BORRADOR', 'TIMBRADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('REGISTRADA', 'PENDIENTE_OC', 'AUTORIZADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('BORRADOR', 'PENDIENTE_PRECIO', 'ENVIADA', 'AUTORIZADA', 'RECHAZADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."service_order_status" AS ENUM('EN_ESPERA', 'EN_REPARACION', 'EN_ESPERA_REFACCIONES', 'REPARACION_TERMINADA', 'SIN_REPARACION');--> statement-breakpoint
ALTER TYPE "public"."mot_custody_status" ADD VALUE 'SALIDA_PRUEBA' BEFORE 'EGRESADO';--> statement-breakpoint
CREATE TABLE "attendance_punches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"punched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"direction" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"attention_type" "attention_type" NOT NULL,
	"equi_id" uuid,
	"mot_id" uuid,
	"reported_fault" text,
	"status" text DEFAULT 'ABIERTA' NOT NULL,
	"created_by_user_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"servomotores_inventory_enabled" boolean DEFAULT false NOT NULL,
	"test_mode_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagnoses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_id" uuid NOT NULL,
	"priority" "diagnosis_priority" DEFAULT 'NORMAL' NOT NULL,
	"status" "diagnosis_status" DEFAULT 'ABIERTO' NOT NULL,
	"snapshot_price_mxn" integer,
	"snapshot_sla_days" integer,
	"manager_validated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_number" text NOT NULL,
	"full_name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"part_number" text NOT NULL,
	"description" text NOT NULL,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"min_quantity" integer,
	"max_quantity" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"folio" text NOT NULL,
	"total_mxn" integer DEFAULT 0 NOT NULL,
	"status" "invoice_status" DEFAULT 'BORRADOR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"invoice_id" uuid,
	"amount_mxn" integer NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"supplier_id" uuid,
	"description" text NOT NULL,
	"amount_mxn" integer NOT NULL,
	"status" "purchase_status" DEFAULT 'REGISTRADA' NOT NULL,
	"requires_ceo_auth" boolean DEFAULT false NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_send_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"folio" text NOT NULL,
	"status" "quote_status" DEFAULT 'BORRADOR' NOT NULL,
	"pending_pricing" boolean DEFAULT true NOT NULL,
	"commercial_reference" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"attendance_id" uuid NOT NULL,
	"folio" text NOT NULL,
	"status" "service_order_status" DEFAULT 'EN_ESPERA' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technical_log_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"mot_id" uuid,
	"attendance_id" uuid,
	"body" text NOT NULL,
	"author_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equi_units" ADD COLUMN "warehouse_status" "equi_warehouse_status" DEFAULT 'SIN_ENTRADA' NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_punches" ADD CONSTRAINT "attendance_punches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_punches" ADD CONSTRAINT "attendance_punches_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_equi_id_equi_units_id_fk" FOREIGN KEY ("equi_id") REFERENCES "public"."equi_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_mot_id_mot_units_id_fk" FOREIGN KEY ("mot_id") REFERENCES "public"."mot_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_attendance_id_attendances_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_parts" ADD CONSTRAINT "inventory_parts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_send_contacts" ADD CONSTRAINT "quote_send_contacts_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_send_contacts" ADD CONSTRAINT "quote_send_contacts_contact_id_client_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_attendance_id_attendances_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_log_entries" ADD CONSTRAINT "technical_log_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_log_entries" ADD CONSTRAINT "technical_log_entries_mot_id_mot_units_id_fk" FOREIGN KEY ("mot_id") REFERENCES "public"."mot_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_log_entries" ADD CONSTRAINT "technical_log_entries_attendance_id_attendances_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_log_entries" ADD CONSTRAINT "technical_log_entries_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendances_company_idx" ON "attendances" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "attendances_equi_idx" ON "attendances" USING btree ("equi_id");--> statement-breakpoint
CREATE INDEX "attendances_mot_idx" ON "attendances" USING btree ("mot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_company_number" ON "employees" USING btree ("company_id","employee_number");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_parts_company_part" ON "inventory_parts" USING btree ("company_id","part_number");--> statement-breakpoint
CREATE INDEX "invoices_company_idx" ON "invoices" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "purchases_company_idx" ON "purchases" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "quote_send_contacts_quote_idx" ON "quote_send_contacts" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "quotes_company_status_idx" ON "quotes" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "technical_log_mot_idx" ON "technical_log_entries" USING btree ("mot_id");