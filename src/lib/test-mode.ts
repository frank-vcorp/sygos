import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { testSessionParticipants, testSessions } from "@/db/schema";

export async function getActiveTestSession() {
  const db = getDb();
  const [row] = await db.select().from(testSessions).where(eq(testSessions.active, true)).limit(1);
  return row ?? null;
}

export async function isUserInTestMode(userId: string) {
  const session = await getActiveTestSession();
  if (!session) return false;
  const db = getDb();
  const [p] = await db
    .select()
    .from(testSessionParticipants)
    .where(and(eq(testSessionParticipants.sessionId, session.id), eq(testSessionParticipants.userId, userId)))
    .limit(1);
  return !!p;
}

export function assertNotTestBlocked(inTest: boolean, action: string) {
  if (inTest) throw new Error(`Modo pruebas: ${action} no afecta datos reales (operación bloqueada)`);
}
