import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { companySettings, purchases } from "@/db/schema";

export function currentCalendarMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getPurchaseLimits(companyId: string) {
  const db = getDb();
  const [s] = await db.select().from(companySettings).where(eq(companySettings.companyId, companyId)).limit(1);
  return {
    monthlyBudgetMxn: s?.monthlyPurchaseBudgetMxn ?? 5000,
    maxDirectMxn: s?.maxDirectPurchaseMxn ?? 2000,
  };
}

export async function monthlyCommittedMxn(companyId: string, month: string) {
  const db = getDb();
  const rows = await db
    .select({ sum: sql<number>`coalesce(sum(${purchases.amountMxn}), 0)` })
    .from(purchases)
    .where(
      and(
        eq(purchases.companyId, companyId),
        eq(purchases.calendarMonth, month),
        sql`${purchases.status} != 'CANCELADA'`,
      ),
    );
  return Number(rows[0]?.sum ?? 0);
}

export async function assertDirectPurchaseAllowed(companyId: string, amountMxn: number) {
  const month = currentCalendarMonth();
  const limits = await getPurchaseLimits(companyId);
  if (amountMxn > limits.maxDirectMxn) {
    throw new Error(`Excede máximo por compra directa ($${limits.maxDirectMxn} MXN). Use O.C.`);
  }
  const used = await monthlyCommittedMxn(companyId, month);
  if (used + amountMxn > limits.monthlyBudgetMxn) {
    throw new Error(`Excede presupuesto mensual ($${limits.monthlyBudgetMxn} MXN). Use O.C.`);
  }
}
