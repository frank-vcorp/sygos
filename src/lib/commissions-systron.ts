import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { commissionEntries, companies, invoices, quotes, users } from "@/db/schema";
import { isoWeekKey } from "@/lib/payroll-rules";

/** Esquema simplificado: 5% sobre factura timbrada para vendedor creador de cotización SYSTRON. */
export async function accrueSystronSaleCommission(invoiceId: string) {
  const db = getDb();
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv?.quoteId) return;
  const [co] = await db.select().from(companies).where(eq(companies.id, inv.companyId)).limit(1);
  if (co?.code !== "SYSTRON") return;
  const [q] = await db.select().from(quotes).where(eq(quotes.id, inv.quoteId)).limit(1);
  if (!q?.createdByUserId) return;
  const [u] = await db.select().from(users).where(eq(users.id, q.createdByUserId)).limit(1);
  if (u?.role !== "VENTAS_SYSTRON") return;
  const amountMxn = Math.round(inv.totalMxn * 0.05);
  const existing = await db
    .select()
    .from(commissionEntries)
    .where(and(eq(commissionEntries.invoiceId, invoiceId), eq(commissionEntries.userId, u.id)))
    .limit(1);
  if (existing[0]) return;
  await db.insert(commissionEntries).values({
    companyId: inv.companyId,
    userId: u.id,
    quoteId: q.id,
    invoiceId,
    amountMxn,
    weekKey: isoWeekKey(),
  });
}
