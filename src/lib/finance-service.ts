import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  clients,
  integrationStampAttempts,
  invoices,
  payableBalances,
  payments,
  receivableBalances,
  suppliers,
} from "@/db/schema";
import { nextCompanyFolio } from "@/lib/folio";

export async function sumInvoicedForQuote(quoteId: string) {
  const db = getDb();
  const rows = await db
    .select({ sum: sql<number>`coalesce(sum(${invoices.totalMxn}), 0)` })
    .from(invoices)
    .where(and(eq(invoices.quoteId, quoteId), sql`${invoices.status} != 'CANCELADA'`));
  return Number(rows[0]?.sum ?? 0);
}

export async function assertPartialInvoiceAllowed(quoteId: string | null, contractTotal: number, newAmount: number) {
  if (!quoteId) return;
  const already = await sumInvoicedForQuote(quoteId);
  if (already + newAmount > contractTotal) {
    throw new Error("Facturación parcial excedería el total del contrato");
  }
}

export async function stampInvoiceWithFacturapi(invoiceId: string, companyId: string) {
  const db = getDb();
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv) throw new Error("Factura no encontrada");
  if (inv.facturapiUuid) return { ok: true as const, uuid: inv.facturapiUuid, saved: true };

  const success = false;
  const error = "Facturapi no configurado — operación guardada sin timbrar";
  await db.insert(integrationStampAttempts).values({
    companyId,
    invoiceId,
    success,
    externalUuid: null,
    errorMessage: error,
  });
  await db
    .update(invoices)
    .set({ lastStampError: error, status: "BORRADOR" })
    .where(eq(invoices.id, invoiceId));
  return { ok: false as const, saved: true, error };
}

export async function retryStampInvoice(invoiceId: string, companyId: string) {
  const db = getDb();
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv?.lastStampError) throw new Error("No hay fallo previo");
  if (inv.facturapiUuid) throw new Error("Ya existe UUID timbrado");
  return stampInvoiceWithFacturapi(invoiceId, companyId);
}

export async function openReceivableForInvoice(invoiceId: string, companyId: string, clientId: string, amount: number) {
  const db = getDb();
  await db.insert(receivableBalances).values({
    companyId,
    clientId,
    invoiceId,
    openMxn: amount,
  });
}

export async function applyValidatedPayment(paymentId: string) {
  const db = getDb();
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!p || p.validationStatus === "VALIDADO") return;
  if (!p.invoiceId) {
    await db.update(payments).set({ validationStatus: "VALIDADO" }).where(eq(payments.id, paymentId));
    return;
  }
  const [recv] = await db
    .select()
    .from(receivableBalances)
    .where(eq(receivableBalances.invoiceId, p.invoiceId))
    .limit(1);
  if (recv) {
    await db
      .update(receivableBalances)
      .set({ openMxn: Math.max(0, recv.openMxn - p.amountMxn) })
      .where(eq(receivableBalances.id, recv.id));
  }
  await db.update(payments).set({ validationStatus: "VALIDADO" }).where(eq(payments.id, paymentId));
  if (p.invoiceId) {
    const { accrueSystronSaleCommission } = await import("@/lib/commissions-systron");
    await accrueSystronSaleCommission(p.invoiceId);
  }
}

export async function createIntercompanyInvoice(smCompanyId: string, systronCompanyId: string, amountMxn: number) {
  const db = getDb();
  const [smClient] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.companyId, smCompanyId), eq(clients.isIntercompany, true)))
    .limit(1);
  if (!smClient) throw new Error("Cliente intercompañía SYSTRON en Servomotores no encontrado");

  const n = await nextCompanyFolio(smCompanyId, "INV");
  const [smInv] = await db
    .insert(invoices)
    .values({
      companyId: smCompanyId,
      clientId: smClient.id,
      folio: `FAC-${n.padStart(4, "0")}`,
      totalMxn: amountMxn,
      isIntercompany: true,
      status: "BORRADOR",
    })
    .returning();

  await openReceivableForInvoice(smInv.id, smCompanyId, smClient.id, amountMxn);

  const [systronSupplier] = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.companyId, systronCompanyId), eq(suppliers.isIntercompany, true)))
    .limit(1);

  if (systronSupplier) {
    await db.insert(payableBalances).values({
      companyId: systronCompanyId,
      supplierId: systronSupplier.id,
      invoiceId: smInv.id,
      openMxn: amountMxn,
    });
  }

  return smInv;
}

export async function applyIntercompanyPayment(smCompanyId: string, systronCompanyId: string, amountMxn: number) {
  const db = getDb();
  const [recv] = await db
    .select()
    .from(receivableBalances)
    .where(and(eq(receivableBalances.companyId, smCompanyId), sql`${receivableBalances.openMxn} > 0`))
    .limit(1);
  if (!recv) throw new Error("Sin CxC abierta en Servomotores");
  const applied = Math.min(recv.openMxn, amountMxn);
  await db
    .update(receivableBalances)
    .set({ openMxn: recv.openMxn - applied })
    .where(eq(receivableBalances.id, recv.id));

  const [pay] = await db
    .select()
    .from(payableBalances)
    .where(and(eq(payableBalances.companyId, systronCompanyId), sql`${payableBalances.openMxn} > 0`))
    .limit(1);
  if (pay) {
    await db
      .update(payableBalances)
      .set({ openMxn: Math.max(0, pay.openMxn - applied) })
      .where(eq(payableBalances.id, pay.id));
  }
  return applied;
}
