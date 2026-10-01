CREATE TYPE "public"."quote_offer_type" AS ENUM('DIAGNOSTICO', 'REPARACION_SERVICIO', 'SERVICIO_CAMPO', 'VENTA_EQUIPO');--> statement-breakpoint
CREATE TYPE "public"."quote_line_kind" AS ENUM('SERVICIO', 'PRODUCTO');--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "offer_type" "quote_offer_type";--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "equi_id" uuid;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "mot_id" uuid;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "preliminary_brand" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "preliminary_model" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "preliminary_serial" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "preliminary_notes" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "commercial_notes" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_equi_id_equi_units_id_fk" FOREIGN KEY ("equi_id") REFERENCES "public"."equi_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_mot_id_mot_units_id_fk" FOREIGN KEY ("mot_id") REFERENCES "public"."mot_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "quote_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"kind" "quote_line_kind" NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_lines_quote_idx" ON "quote_lines" USING btree ("quote_id");--> statement-breakpoint
CREATE TABLE "quote_intended_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_intended_contacts" ADD CONSTRAINT "quote_intended_contacts_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_intended_contacts" ADD CONSTRAINT "quote_intended_contacts_contact_id_client_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_intended_contacts_quote_idx" ON "quote_intended_contacts" USING btree ("quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_intended_contacts_unique" ON "quote_intended_contacts" USING btree ("quote_id","contact_id");
