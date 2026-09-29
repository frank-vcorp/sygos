import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { companySettings } from "@/db/schema";

export async function ensureCompanySettings(companyId: string) {
  const db = getDb();
  const rows = await db.select().from(companySettings).where(eq(companySettings.companyId, companyId)).limit(1);
  if (rows[0]) return rows[0];
  const [row] = await db.insert(companySettings).values({ companyId }).returning();
  return row;
}

export async function getCompanySettings(companyId: string) {
  return ensureCompanySettings(companyId);
}
