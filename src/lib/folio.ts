import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { folioSequences } from "@/db/schema";

export async function nextCompanyFolio(companyId: string, key: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(folioSequences)
      .where(
        and(
          eq(folioSequences.scope, "COMPANY"),
          eq(folioSequences.companyId, companyId),
          eq(folioSequences.key, key),
        ),
      )
      .for("update");

    let seq = rows[0];
    if (!seq) {
      const inserted = await tx
        .insert(folioSequences)
        .values({ scope: "COMPANY", companyId, key, lastValue: "0" })
        .returning();
      seq = inserted[0];
    }

    const next = String(Number(seq.lastValue) + 1);
    await tx
      .update(folioSequences)
      .set({ lastValue: next, updatedAt: sql`now()` })
      .where(eq(folioSequences.id, seq.id));

    return next;
  });
}

export async function nextMotFolio() {
  const db = getDb();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(folioSequences)
      .where(and(eq(folioSequences.scope, "GLOBAL_MOT"), eq(folioSequences.key, "MOT")))
      .for("update");

    let seq = rows[0];
    if (!seq) {
      const inserted = await tx
        .insert(folioSequences)
        .values({ scope: "GLOBAL_MOT", companyId: null, key: "MOT", lastValue: "0" })
        .returning();
      seq = inserted[0];
    }

    const next = String(Number(seq.lastValue) + 1);
    await tx
      .update(folioSequences)
      .set({ lastValue: next, updatedAt: sql`now()` })
      .where(eq(folioSequences.id, seq.id));

    return `MOT-${next}`;
  });
}
