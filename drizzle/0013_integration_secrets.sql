CREATE TYPE "public"."document_delivery_channel" AS ENUM('EMAIL', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "public"."document_delivery_status" AS ENUM('PENDING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_connection_status" AS ENUM('DISCONNECTED', 'QR_PENDING', 'CONNECTED');--> statement-breakpoint
CREATE TABLE "document_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"channel" "document_delivery_channel" NOT NULL,
	"status" "document_delivery_status" DEFAULT 'PENDING' NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"contact_id" uuid,
	"recipient" text NOT NULL,
	"subject" text,
	"error_message" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"integration" "integration_key" NOT NULL,
	"ciphertext" text NOT NULL,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"status" "whatsapp_connection_status" DEFAULT 'DISCONNECTED' NOT NULL,
	"linked_phone" text,
	"auth_ciphertext" text,
	"last_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_deliveries" ADD CONSTRAINT "document_deliveries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_deliveries" ADD CONSTRAINT "document_deliveries_contact_id_client_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_deliveries" ADD CONSTRAINT "document_deliveries_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_secrets" ADD CONSTRAINT "integration_secrets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_secrets" ADD CONSTRAINT "integration_secrets_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_deliveries_company_idx" ON "document_deliveries" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "document_deliveries_entity_idx" ON "document_deliveries" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_secrets_company_key" ON "integration_secrets" USING btree ("company_id","integration");--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_sessions_company_unique" ON "whatsapp_sessions" USING btree ("company_id");
