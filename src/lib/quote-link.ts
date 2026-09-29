import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { quotes } from "@/db/schema";

export async function propagateClientDecisionToLinkedQuote(
  systronQuoteId: string,
  decision: "AUTORIZADA" | "RECHAZADA",
) {
  const db = getDb();
  const [q] = await db.select().from(quotes).where(eq(quotes.id, systronQuoteId)).limit(1);
  if (!q?.linkedQuoteId) return;
  const linkedStatus =
    decision === "AUTORIZADA" ? ("AUTORIZADA" as const) : ("RECHAZADA" as const);
  await db.update(quotes).set({ status: linkedStatus, updatedAt: new Date() }).where(eq(quotes.id, q.linkedQuoteId));
}
