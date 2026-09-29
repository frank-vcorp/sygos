import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { testSessions } from "@/db/schema";

export async function getActiveTestSession() {
  const db = getDb();
  const [row] = await db.select().from(testSessions).where(eq(testSessions.active, true)).limit(1);
  return row ?? null;
}
