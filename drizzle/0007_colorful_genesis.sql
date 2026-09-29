CREATE TABLE "equi_warehouse_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equi_id" uuid NOT NULL,
	"from_status" "equi_warehouse_status",
	"to_status" "equi_warehouse_status" NOT NULL,
	"note" text,
	"author_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mot_custody_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mot_id" uuid NOT NULL,
	"from_status" "mot_custody_status",
	"to_status" "mot_custody_status" NOT NULL,
	"note" text,
	"recipient" text,
	"document_ref" text,
	"author_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mot_units" ADD COLUMN "sla_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mot_units" ADD COLUMN "egress_recipient" text;--> statement-breakpoint
ALTER TABLE "mot_units" ADD COLUMN "egress_document_ref" text;--> statement-breakpoint
ALTER TABLE "mot_units" ADD COLUMN "egress_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "equi_warehouse_events" ADD CONSTRAINT "equi_warehouse_events_equi_id_equi_units_id_fk" FOREIGN KEY ("equi_id") REFERENCES "public"."equi_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equi_warehouse_events" ADD CONSTRAINT "equi_warehouse_events_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mot_custody_events" ADD CONSTRAINT "mot_custody_events_mot_id_mot_units_id_fk" FOREIGN KEY ("mot_id") REFERENCES "public"."mot_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mot_custody_events" ADD CONSTRAINT "mot_custody_events_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "equi_warehouse_events_equi_idx" ON "equi_warehouse_events" USING btree ("equi_id");--> statement-breakpoint
CREATE INDEX "mot_custody_events_mot_idx" ON "mot_custody_events" USING btree ("mot_id");