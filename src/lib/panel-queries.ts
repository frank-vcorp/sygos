import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  documentRequests,
  invoices,
  payments,
  payableBalances,
  pendingReceipts,
  purchaseOrders,
  purchases,
  quotes,
  receivableBalances,
  remissions,
  technicalProductionCredits,
} from "@/db/schema";
export async function ceoPanelSnapshot(companyId: string) {
  const db = getDb();
  const pendingOc = await db
    .select()
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.companyId, companyId), eq(purchaseOrders.status, "PENDIENTE_AUTORIZACION")))
    .limit(20);
  const pendingQuotes = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.companyId, companyId), eq(quotes.pendingPricing, true)))
    .limit(30);
  return { pendingOc, pendingQuotes };
}

export async function coordinationPanelSnapshot(companyId: string) {
  const db = getDb();
  const [invoiceCount, remCount, payPending, purchasesOpen, ocAuth, recv, payables] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(invoices).where(eq(invoices.companyId, companyId)),
    db.select({ n: sql<number>`count(*)` }).from(remissions).where(eq(remissions.companyId, companyId)),
    db
      .select()
      .from(payments)
      .where(and(eq(payments.companyId, companyId), eq(payments.validationStatus, "PENDIENTE_VALIDACION")))
      .limit(10),
    db
      .select()
      .from(purchases)
      .where(and(eq(purchases.companyId, companyId), sql`${purchases.status} in ('REGISTRADA','PENDIENTE_OC')`))
      .limit(10),
    db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.companyId, companyId), eq(purchaseOrders.status, "AUTORIZADA")))
      .limit(10),
    db.select().from(receivableBalances).where(eq(receivableBalances.companyId, companyId)).limit(10),
    db.select().from(payableBalances).where(eq(payableBalances.companyId, companyId)).limit(10),
  ]);
  const docReq = await db
    .select()
    .from(documentRequests)
    .where(and(eq(documentRequests.companyId, companyId), eq(documentRequests.status, "SOLICITADA")))
    .limit(10);
  return {
    invoices: Number(invoiceCount[0]?.n ?? 0),
    remissions: Number(remCount[0]?.n ?? 0),
    paymentsPending: payPending,
    purchasesOpen,
    purchaseOrdersAuthorized: ocAuth,
    receivables: recv,
    payables,
    documentRequests: docReq,
  };
}

export async function gerenteSmPanelSnapshot(companyId: string) {
  const db = getDb();
  const pendingQuotes = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.companyId, companyId), eq(quotes.pendingPricing, true)))
    .limit(15);
  const production = await db.select().from(technicalProductionCredits).limit(15);
  const buys = await db
    .select()
    .from(purchases)
    .where(eq(purchases.companyId, companyId))
    .orderBy(sql`${purchases.createdAt} desc`)
    .limit(10);
  const pendingReceiptsRows = await db
    .select()
    .from(pendingReceipts)
    .where(and(eq(pendingReceipts.companyId, companyId), eq(pendingReceipts.status, "PENDIENTE")))
    .limit(10);
  return { pendingQuotes, production, purchases: buys, pendingReceipts: pendingReceiptsRows };
}
