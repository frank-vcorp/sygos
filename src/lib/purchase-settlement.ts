import { getDb } from "@/db/client";
import { cashDisbursements, payableBalances, purchases } from "@/db/schema";
import { nextCompanyFolio } from "@/lib/folio";
import { eq } from "drizzle-orm";

export async function settlePurchaseAsPayable(
  companyId: string,
  purchaseId: string,
  supplierId: string,
  amountMxn: number,
) {
  const db = getDb();
  const [ap] = await db
    .insert(payableBalances)
    .values({ companyId, supplierId, openMxn: amountMxn })
    .returning();
  await db
    .update(purchases)
    .set({ payableBalanceId: ap.id, cashDisbursementId: null })
    .where(eq(purchases.id, purchaseId));
  return ap.id;
}

export async function settlePurchaseAsDisbursement(
  companyId: string,
  purchaseId: string,
  description: string,
  amountMxn: number,
  supplierId: string | null,
  testMode?: boolean,
) {
  const db = getDb();
  const n = await nextCompanyFolio(companyId, "EGR", { testMode });
  const [eg] = await db
    .insert(cashDisbursements)
    .values({
      companyId,
      folio: `EGR-${n.padStart(4, "0")}`,
      amountMxn,
      description,
      supplierId,
    })
    .returning();
  await db
    .update(purchases)
    .set({ cashDisbursementId: eg.id, payableBalanceId: null })
    .where(eq(purchases.id, purchaseId));
  return eg.id;
}
