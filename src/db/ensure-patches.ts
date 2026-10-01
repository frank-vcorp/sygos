import { sql } from "drizzle-orm";
import { getDb } from "./client";

/** Idempotent SQL fixes when drizzle journal and live DB diverge (staging safety). */
export async function ensureDbPatches() {
  const db = getDb();
  await db.execute(sql`ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "brand_logo_path" text`);
  await db.execute(sql`ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "brand_logo_mime_type" text`);
  await db.execute(sql`ALTER TABLE "remissions" ADD COLUMN IF NOT EXISTS "quote_id" uuid`);
}
