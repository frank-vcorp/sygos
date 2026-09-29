CREATE TYPE "public"."quote_pending_origin" AS ENUM('COTIZACION_INICIADA', 'DIAGNOSTICO_VALIDADO', 'REPARACION_PENDIENTE_PRECIO', 'GARANTIA_NO_PROCEDENTE', 'MOT_INTERCOMPANIA');--> statement-breakpoint
ALTER TYPE "public"."quote_status" ADD VALUE 'AUTORIZADA_PENDIENTE_INGRESO_EQUIPO' BEFORE 'RECHAZADA';--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "pending_origin" "quote_pending_origin" DEFAULT 'COTIZACION_INICIADA';--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "attendance_id" uuid;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "price_mxn" integer;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "final_price_mxn" integer;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "discount_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "systron_supplier_cost_mxn" integer;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "linked_quote_id" uuid;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "authorized_without_equipment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_attendance_id_attendances_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendances"("id") ON DELETE no action ON UPDATE no action;