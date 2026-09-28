CREATE TYPE "public"."client_classification" AS ENUM('NORMAL', 'PREMIUM');--> statement-breakpoint
CREATE TYPE "public"."integration_key" AS ENUM('FACTURAPI', 'SENDGRID', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "public"."prospect_status" AS ENUM('NUEVO', 'EN_SEGUIMIENTO', 'CONVERTIDO', 'DESCARTADO');--> statement-breakpoint
CREATE TABLE "client_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"role_title" text,
	"email" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"classification" "client_classification" DEFAULT 'NORMAL',
	"responsible_user_id" uuid,
	"shipping_address" text,
	"tax_identity" text,
	"credit_days" integer DEFAULT 0 NOT NULL,
	"requires_invoice" boolean DEFAULT true NOT NULL,
	"is_intercompany" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"integration" "integration_key" NOT NULL,
	"configured" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"responsible_user_id" uuid,
	"source" text,
	"note" text,
	"status" "prospect_status" DEFAULT 'NUEVO' NOT NULL,
	"converted_client_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"tax_identity" text,
	"credit_days" integer DEFAULT 0 NOT NULL,
	"emits_fiscal_invoice" boolean DEFAULT true NOT NULL,
	"category" text,
	"is_intercompany" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_settings" ADD CONSTRAINT "integration_settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_converted_client_id_clients_id_fk" FOREIGN KEY ("converted_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_contacts_client_idx" ON "client_contacts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "clients_company_name_idx" ON "clients" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "clients_company_active_idx" ON "clients" USING btree ("company_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_settings_company_key" ON "integration_settings" USING btree ("company_id","integration");--> statement-breakpoint
CREATE INDEX "prospects_company_status_idx" ON "prospects" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "prospects_company_name_idx" ON "prospects" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "suppliers_company_name_idx" ON "suppliers" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "suppliers_company_active_idx" ON "suppliers" USING btree ("company_id","active");