CREATE TYPE "public"."repair_priority" AS ENUM('NORMAL', 'ALTA', 'EXPRESS');--> statement-breakpoint
CREATE TYPE "public"."repair_status" AS ENUM('EN_ESPERA', 'EN_REPARACION', 'EN_ESPERA_REFACCIONES', 'REPARACION_TERMINADA', 'SIN_REPARACION');--> statement-breakpoint
CREATE TYPE "public"."warranty_outcome" AS ENUM('PENDIENTE', 'PROCEDENTE', 'NO_PROCEDENTE', 'CEO_VALIDADA');--> statement-breakpoint
ALTER TYPE "public"."diagnosis_status" ADD VALUE 'PENDIENTE_VALIDACION_GERENTE' BEFORE 'DEVUELTO_CORRECCION';--> statement-breakpoint
CREATE TABLE "diagnosis_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diagnosis_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"instruction" text NOT NULL,
	"author_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_service_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"attendance_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"outbound_at" timestamp with time zone,
	"inbound_at" timestamp with time zone,
	"outbound_note" text,
	"inbound_note" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_id" uuid NOT NULL,
	"priority" "repair_priority" DEFAULT 'NORMAL' NOT NULL,
	"snapshot_increment_percent" integer DEFAULT 0 NOT NULL,
	"snapshot_sla_days" integer DEFAULT 10 NOT NULL,
	"status" "repair_status" DEFAULT 'EN_ESPERA' NOT NULL,
	"completed_by_user_id" uuid,
	"production_attributed_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technical_production_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"credited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diagnoses" ADD COLUMN "completed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD COLUMN "production_attributed_user_id" uuid;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD COLUMN "warranty_reference_paid_egress_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD COLUMN "warranty_valid_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD COLUMN "warranty_outcome" "warranty_outcome" DEFAULT 'PENDIENTE';--> statement-breakpoint
ALTER TABLE "mot_units" ADD COLUMN "paid_repair_egress_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "diagnosis_corrections" ADD CONSTRAINT "diagnosis_corrections_diagnosis_id_diagnoses_id_fk" FOREIGN KEY ("diagnosis_id") REFERENCES "public"."diagnoses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosis_corrections" ADD CONSTRAINT "diagnosis_corrections_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_service_cases" ADD CONSTRAINT "external_service_cases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_service_cases" ADD CONSTRAINT "external_service_cases_attendance_id_attendances_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_service_cases" ADD CONSTRAINT "external_service_cases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_service_cases" ADD CONSTRAINT "external_service_cases_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_attendance_id_attendances_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_completed_by_user_id_users_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_production_attributed_user_id_users_id_fk" FOREIGN KEY ("production_attributed_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_production_credits" ADD CONSTRAINT "technical_production_credits_attendance_id_attendances_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_production_credits" ADD CONSTRAINT "technical_production_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_completed_by_user_id_users_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_production_attributed_user_id_users_id_fk" FOREIGN KEY ("production_attributed_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;