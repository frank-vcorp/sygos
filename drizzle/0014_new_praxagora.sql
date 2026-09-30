ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "brand_logo_path" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "brand_logo_mime_type" text;
