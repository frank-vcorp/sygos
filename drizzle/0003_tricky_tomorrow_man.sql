CREATE TYPE "public"."mot_custody_status" AS ENUM('PENDIENTE_INGRESO_SERVOMOTORES', 'EN_RESGUARDO_SERVOMOTORES', 'EGRESADO');--> statement-breakpoint
CREATE TABLE "equi_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"folio" text NOT NULL,
	"client_id" uuid NOT NULL,
	"equipment_type" text,
	"brand" text,
	"model" text NOT NULL,
	"description" text,
	"manufacturer_serial" text,
	"created_by_user_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mot_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folio" text NOT NULL,
	"origin_company_id" uuid NOT NULL,
	"origin_company_code" "company_code" NOT NULL,
	"systron_client_id" uuid,
	"servomotores_client_id" uuid,
	"systron_responsible_user_id" uuid,
	"brand" text,
	"model" text NOT NULL,
	"description" text,
	"manufacturer_serial" text,
	"custody_status" "mot_custody_status" NOT NULL,
	"physical_ingress_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equi_units" ADD CONSTRAINT "equi_units_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equi_units" ADD CONSTRAINT "equi_units_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equi_units" ADD CONSTRAINT "equi_units_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mot_units" ADD CONSTRAINT "mot_units_origin_company_id_companies_id_fk" FOREIGN KEY ("origin_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mot_units" ADD CONSTRAINT "mot_units_systron_client_id_clients_id_fk" FOREIGN KEY ("systron_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mot_units" ADD CONSTRAINT "mot_units_servomotores_client_id_clients_id_fk" FOREIGN KEY ("servomotores_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mot_units" ADD CONSTRAINT "mot_units_systron_responsible_user_id_users_id_fk" FOREIGN KEY ("systron_responsible_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mot_units" ADD CONSTRAINT "mot_units_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "equi_units_company_folio" ON "equi_units" USING btree ("company_id","folio");--> statement-breakpoint
CREATE INDEX "equi_units_company_client_idx" ON "equi_units" USING btree ("company_id","client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mot_units_folio_unique" ON "mot_units" USING btree ("folio");--> statement-breakpoint
CREATE INDEX "mot_units_origin_idx" ON "mot_units" USING btree ("origin_company_id");--> statement-breakpoint
CREATE INDEX "mot_units_custody_idx" ON "mot_units" USING btree ("custody_status");