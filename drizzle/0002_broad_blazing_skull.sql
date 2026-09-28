CREATE TYPE "public"."master_entity" AS ENUM('CLIENT', 'PROSPECT', 'SUPPLIER');--> statement-breakpoint
CREATE TYPE "public"."master_event_type" AS ENUM('UPDATED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "master_record_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"entity_type" "master_entity" NOT NULL,
	"entity_id" uuid NOT NULL,
	"event_type" "master_event_type" NOT NULL,
	"reason" text,
	"actor_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "folio" text;--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "folio" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "folio" text;--> statement-breakpoint
ALTER TABLE "master_record_events" ADD CONSTRAINT "master_record_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_record_events" ADD CONSTRAINT "master_record_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "master_record_events_entity_idx" ON "master_record_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "master_record_events_company_idx" ON "master_record_events" USING btree ("company_id");