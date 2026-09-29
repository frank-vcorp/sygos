import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { folioSequences } from "@/db/schema";

export async function nextCompanyFolio(companyId: string, key: string, opts?: { testMode?: boolean }) {
  const effectiveKey = opts?.testMode ? `TEST_${key}` : key;
  const db = getDb();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(folioSequences)
      .where(
        and(
          eq(folioSequences.scope, "COMPANY"),
          eq(folioSequences.companyId, companyId),
          eq(folioSequences.key, effectiveKey),
        ),
      )
      .for("update");

    let seq = rows[0];
    if (!seq) {
      const inserted = await tx
        .insert(folioSequences)
        .values({ scope: "COMPANY", companyId, key: effectiveKey, lastValue: "0" })
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

export async function nextMotFolio(opts?: { testMode?: boolean }) {
  const motKey = opts?.testMode ? "TEST_MOT" : "MOT";
  const db = getDb();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(folioSequences)
      .where(and(eq(folioSequences.scope, "GLOBAL_MOT"), eq(folioSequences.key, motKey)))
      .for("update");

    let seq = rows[0];
    if (!seq) {
      const inserted = await tx
        .insert(folioSequences)
        .values({ scope: "GLOBAL_MOT", companyId: null, key: motKey, lastValue: "0" })
        .returning();
      seq = inserted[0];
    }

    const next = String(Number(seq.lastValue) + 1);
    await tx
      .update(folioSequences)
      .set({ lastValue: next, updatedAt: sql`now()` })
      .where(eq(folioSequences.id, seq.id));

    return opts?.testMode ? `TEST-MOT-${next}` : `MOT-${next}`;
  });
}
