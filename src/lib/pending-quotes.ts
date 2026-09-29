import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { attendances, clients, diagnoses, quotes, repairs } from "@/db/schema";
import { nextCompanyFolio } from "@/lib/folio";

export async function ensureQuoteFromValidatedDiagnosis(attendanceId: string, companyId: string, userId: string) {
  const db = getDb();
  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.attendanceId, attendanceId), eq(quotes.companyId, companyId)))
    .limit(1);
  if (existing[0]) return existing[0];

  const [att] = await db.select().from(attendances).where(eq(attendances.id, attendanceId)).limit(1);
  if (!att) return null;

  let clientId: string | null = null;
  if (att.equiId) {
    const { equiUnits } = await import("@/db/schema");
    const [e] = await db.select().from(equiUnits).where(eq(equiUnits.id, att.equiId)).limit(1);
    clientId = e?.clientId ?? null;
  }
  if (!clientId && att.motId) {
    const { motUnits } = await import("@/db/schema");
    const [m] = await db.select().from(motUnits).where(eq(motUnits.id, att.motId)).limit(1);
    clientId = m?.servomotoresClientId ?? m?.systronClientId ?? null;
  }
  if (!clientId) return null;

  const [co] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!co) return null;

  const n = await nextCompanyFolio(companyId, "QUOTE");
  const folio = `COT-${n.padStart(4, "0")}`;
  const [diag] = await db.select().from(diagnoses).where(eq(diagnoses.attendanceId, attendanceId)).limit(1);
  let origin: (typeof quotes.$inferInsert)["pendingOrigin"] = "DIAGNOSTICO_VALIDADO";
  if (att.attentionType === "DIAGNOSTICO_GARANTIA" && diag?.warrantyOutcome === "NO_PROCEDENTE") {
    origin = "GARANTIA_NO_PROCEDENTE";
  }
  if (co.isIntercompany) origin = "MOT_INTERCOMPANIA";

  const [row] = await db
    .insert(quotes)
    .values({
      companyId,
      clientId,
      folio,
      status: "PENDIENTE_PRECIO",
      pendingPricing: true,
      pendingOrigin: origin,
      attendanceId,
      createdByUserId: userId,
    })
    .returning();
  return row;
}

export async function ensureQuoteFromRepairPending(attendanceId: string, companyId: string, userId: string) {
  const db = getDb();
  const [repair] = await db.select().from(repairs).where(eq(repairs.attendanceId, attendanceId)).limit(1);
  if (!repair || (repair.status !== "REPARACION_TERMINADA" && repair.status !== "SIN_REPARACION")) return null;
  return ensureQuoteFromValidatedDiagnosis(attendanceId, companyId, userId).then(async (q) => {
    if (!q) return null;
    await db
      .update(quotes)
      .set({ pendingOrigin: "REPARACION_PENDIENTE_PRECIO" })
      .where(and(eq(quotes.id, q.id), isNull(quotes.priceMxn)));
    return q;
  });
}
