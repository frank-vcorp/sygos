import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { testSessionMutations, testSessionParticipants } from "@/db/schema";
import { getActiveTestSession } from "@/lib/test-mode";

export async function isUserInTestMode(userId: string) {
  const session = await getActiveTestSession();
  if (!session) return { active: false as const, sessionId: null };
  const db = getDb();
  const [p] = await db
    .select()
    .from(testSessionParticipants)
    .where(and(eq(testSessionParticipants.sessionId, session.id), eq(testSessionParticipants.userId, userId)))
    .limit(1);
  return { active: !!p, sessionId: p ? session.id : null };
}

export async function logTestMutation(sessionId: string, tableName: string, rowId: string) {
  const db = getDb();
  await db.insert(testSessionMutations).values({ sessionId, tableName, rowId });
}

const DELETABLE_TABLES = new Set([
  "quotes",
  "invoices",
  "payments",
  "purchases",
  "purchase_orders",
  "cash_disbursements",
  "payable_balances",
  "pending_receipts",
  "credit_notes",
]);

export async function discardTestSessionMutations(sessionId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(testSessionMutations)
    .where(eq(testSessionMutations.sessionId, sessionId))
    .orderBy(sql`${testSessionMutations.createdAt} desc`);
  for (const row of rows) {
    if (!DELETABLE_TABLES.has(row.tableName)) continue;
    await db.execute(sql.raw(`delete from "${row.tableName}" where id = '${row.rowId}'`));
  }
  await db.delete(testSessionMutations).where(eq(testSessionMutations.sessionId, sessionId));
}
