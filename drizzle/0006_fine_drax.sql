CREATE TABLE "client_communication_recipients" (
	"communication_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"channel" text DEFAULT 'GENERAL' NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_communication_recipients" ADD CONSTRAINT "client_communication_recipients_communication_id_client_communications_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."client_communications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_communication_recipients" ADD CONSTRAINT "client_communication_recipients_contact_id_client_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."client_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_communications" ADD CONSTRAINT "client_communications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_communications" ADD CONSTRAINT "client_communications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_communications" ADD CONSTRAINT "client_communications_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "client_communication_recipients_unique" ON "client_communication_recipients" USING btree ("communication_id","contact_id");--> statement-breakpoint
CREATE INDEX "client_communications_client_idx" ON "client_communications" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "client_communications_company_idx" ON "client_communications" USING btree ("company_id");