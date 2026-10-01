"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import {
  cashDisbursements,
  clients,
  creditNotes,
  customerCreditBalances,
  documentRequests,
  invoices,
  payableBalances,
  payments,
  pendingReceipts,
  purchases,
  receivableBalances,
  quotes,
  remissions,
  storedDocuments,
  suppliers,
} from "@/db/schema";
import { revalidateCommercialHub } from "@/lib/revalidate-commercial-hub";
import {
  applyIntercompanyPayment,
  applyValidatedPayment,
  assertPartialInvoiceAllowed,
  createIntercompanyInvoice,
  openReceivableForInvoice,
  retryStampInvoice,
  stampInvoiceWithFacturapi,
} from "@/lib/finance-service";
import { getCompanySettings } from "@/lib/company-settings";
import { nextCompanyFolio } from "@/lib/folio";
import {
  canGenerateFiscalDocuments,
  canRegisterPayment,
  canRequestInvoice,
  canRequestRemission,
  canValidatePayments,
} from "@/lib/permissions-finance";
import { getSession } from "@/lib/session";

async function requireCoord() {
  const session = await getSession();
  if (!session || !canGenerateFiscalDocuments(session)) throw new Error("Sin permiso");
  const { isUserInTestMode } = await import("@/lib/test-mode-guard");
  const test = await isUserInTestMode(session.id);
  if (test.active) throw new Error("Modo pruebas: finanzas reales bloqueadas para este usuario");
  return session;
}

export async function listInvoices(companyId: string) {
  const db = getDb();
  return db.select().from(invoices).where(eq(invoices.companyId, companyId)).orderBy(desc(invoices.createdAt)).limit(100);
}

export async function listInvoicesWithClients(companyId: string) {
  const db = getDb();
  return db
    .select({
      invoice: invoices,
      clientName: clients.name,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(invoices.companyId, companyId))
    .orderBy(desc(invoices.createdAt))
    .limit(100);
}

export async function listDocumentRequests(companyId: string) {
  const db = getDb();
  return db.select().from(documentRequests).where(eq(documentRequests.companyId, companyId)).orderBy(desc(documentRequests.createdAt)).limit(50);
}

export async function listRemissions(companyId: string) {
  const db = getDb();
  return db.select().from(remissions).where(eq(remissions.companyId, companyId)).limit(50);
}

export async function listInvoicesForQuote(quoteId: string, companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(invoices)
    .where(and(eq(invoices.quoteId, quoteId), eq(invoices.companyId, companyId)))
    .orderBy(desc(invoices.createdAt));
}

export async function listDocumentRequestsForQuote(quoteId: string, companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(documentRequests)
    .where(and(eq(documentRequests.quoteId, quoteId), eq(documentRequests.companyId, companyId)))
    .orderBy(desc(documentRequests.createdAt));
}

export async function listInvoicesForClient(clientId: string, companyId: string) {
  const db = getDb();
  return db
    .select({
      invoice: invoices,
      quoteFolio: quotes.folio,
      quoteId: quotes.id,
    })
    .from(invoices)
    .leftJoin(quotes, eq(invoices.quoteId, quotes.id))
    .where(and(eq(invoices.clientId, clientId), eq(invoices.companyId, companyId)))
    .orderBy(desc(invoices.createdAt))
    .limit(50);
}

export async function listRemissionsForClient(clientId: string, companyId: string) {
  const db = getDb();
  return db
    .select({
      remission: remissions,
      quoteFolio: quotes.folio,
      quoteId: quotes.id,
    })
    .from(remissions)
    .leftJoin(quotes, eq(remissions.quoteId, quotes.id))
    .where(and(eq(remissions.clientId, clientId), eq(remissions.companyId, companyId)))
    .orderBy(desc(remissions.createdAt))
    .limit(50);
}

export async function listRemissionsForQuote(quoteId: string, companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(remissions)
    .where(and(eq(remissions.quoteId, quoteId), eq(remissions.companyId, companyId)))
    .orderBy(desc(remissions.createdAt));
}

export async function getInvoiceDetail(companyId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      invoice: invoices,
      clientName: clients.name,
      clientId: clients.id,
      quoteFolio: quotes.folio,
      quoteId: quotes.id,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(quotes, eq(invoices.quoteId, quotes.id))
    .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)))
    .limit(1);
  return row ?? null;
}

export async function listPayablesWithSuppliers(companyId: string) {
  const db = getDb();
  return db
    .select({
      payable: payableBalances,
      supplierName: suppliers.name,
    })
    .from(payableBalances)
    .innerJoin(suppliers, eq(payableBalances.supplierId, suppliers.id))
    .where(eq(payableBalances.companyId, companyId))
    .orderBy(desc(payableBalances.createdAt))
    .limit(50);
}

export async function listDisbursements(companyId: string) {
  const db = getDb();
  return db
    .select({
      disbursement: cashDisbursements,
      supplierName: suppliers.name,
    })
    .from(cashDisbursements)
    .leftJoin(suppliers, eq(cashDisbursements.supplierId, suppliers.id))
    .where(eq(cashDisbursements.companyId, companyId))
    .orderBy(desc(cashDisbursements.createdAt))
    .limit(50);
}

export async function getCashDisbursementDetail(companyId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      disbursement: cashDisbursements,
      supplierName: suppliers.name,
    })
    .from(cashDisbursements)
    .leftJoin(suppliers, eq(cashDisbursements.supplierId, suppliers.id))
    .where(and(eq(cashDisbursements.id, id), eq(cashDisbursements.companyId, companyId)))
    .limit(1);
  if (!row) return null;

  const [purchase] = await db
    .select({ id: purchases.id, description: purchases.description })
    .from(purchases)
    .where(and(eq(purchases.companyId, companyId), eq(purchases.cashDisbursementId, id)))
    .limit(1);

  const [pendingReceipt] = await db
    .select({ id: pendingReceipts.id, status: pendingReceipts.status })
    .from(pendingReceipts)
    .where(and(eq(pendingReceipts.companyId, companyId), eq(pendingReceipts.cashDisbursementId, id)))
    .limit(1);

  return { ...row, purchase: purchase ?? null, pendingReceipt: pendingReceipt ?? null };
}

export async function getPayableDetail(companyId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      payable: payableBalances,
      supplierName: suppliers.name,
    })
    .from(payableBalances)
    .innerJoin(suppliers, eq(payableBalances.supplierId, suppliers.id))
    .where(and(eq(payableBalances.id, id), eq(payableBalances.companyId, companyId)))
    .limit(1);
  if (!row) return null;

  const [purchase] = await db
    .select({ id: purchases.id, description: purchases.description })
    .from(purchases)
    .where(and(eq(purchases.companyId, companyId), eq(purchases.payableBalanceId, id)))
    .limit(1);

  return { ...row, purchase: purchase ?? null };
}

export async function getRemissionDetail(companyId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      remission: remissions,
      clientName: clients.name,
      clientId: clients.id,
      quoteFolio: quotes.folio,
      quoteId: quotes.id,
    })
    .from(remissions)
    .innerJoin(clients, eq(remissions.clientId, clients.id))
    .leftJoin(quotes, eq(remissions.quoteId, quotes.id))
    .where(and(eq(remissions.id, id), eq(remissions.companyId, companyId)))
    .limit(1);
  return row ?? null;
}

export async function listPaymentsForInvoice(invoiceId: string, companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(payments)
    .where(and(eq(payments.invoiceId, invoiceId), eq(payments.companyId, companyId)))
    .orderBy(desc(payments.paidAt))
    .limit(50);
}

export async function getReceivableForInvoice(invoiceId: string, companyId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(receivableBalances)
    .where(and(eq(receivableBalances.invoiceId, invoiceId), eq(receivableBalances.companyId, companyId)))
    .limit(1);
  return row ?? null;
}

function revalidateInvoiceDetail(invoiceId: string) {
  revalidatePath(`/app/finanzas/facturas/${invoiceId}`);
  revalidatePath("/app/finanzas");
}

function revalidateRemissionDetail(remissionId: string) {
  revalidatePath(`/app/finanzas/remisiones/${remissionId}`);
  revalidatePath("/app/finanzas");
}

export async function requestDocumentAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  const type = String(formData.get("requestType") ?? "FACTURA") as "FACTURA" | "REMISION";
  if (type === "FACTURA" && !canRequestInvoice(session)) throw new Error("Sin permiso");
  if (type === "REMISION" && !canRequestRemission(session)) throw new Error("Sin permiso");
  const clientId = String(formData.get("clientId") ?? "");
  const quoteId = String(formData.get("quoteId") ?? "") || null;
  const db = getDb();
  await db.insert(documentRequests).values({
    companyId: session.activeCompany.id,
    clientId,
    requestType: type,
    quoteId,
    requestedByUserId: session.id,
  });
  revalidatePath("/app/finanzas");
  await revalidateCommercialHub({ clientId, quoteId });
}

export async function createInvoiceAction(formData: FormData) {
  const session = await requireCoord();
  const clientId = String(formData.get("clientId") ?? "");
  const totalMxn = Number(formData.get("totalMxn") ?? 0);
  const quoteId = String(formData.get("quoteId") ?? "") || null;
  const contractTotal = Number(formData.get("contractTotalMxn") ?? totalMxn);
  const isFree = formData.get("isFreeInvoice") === "on";
  await assertPartialInvoiceAllowed(quoteId, contractTotal, totalMxn);

  const db = getDb();
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  const requiresCash = client?.requiresInvoice ?? false;

  const n = await nextCompanyFolio(session.activeCompany.id, "INV");
  const folio = `FAC-${n.padStart(4, "0")}`;
  const [inv] = await db
    .insert(invoices)
    .values({
      companyId: session.activeCompany.id,
      clientId,
      quoteId,
      folio,
      totalMxn,
      contractTotalMxn: contractTotal,
      isFreeInvoice: isFree,
      requiresCashPolicy: requiresCash && session.activeCompany.code === "SYSTRON",
      status: "BORRADOR",
    })
    .returning();

  await openReceivableForInvoice(inv.id, session.activeCompany.id, clientId, totalMxn);
  await stampInvoiceWithFacturapi(inv.id, session.activeCompany.id);
  revalidateInvoiceDetail(inv.id);
  await revalidateCommercialHub({ clientId, quoteId });
  redirect(`/app/finanzas/facturas/${inv.id}`);
}

export async function createFreeInvoiceAction(formData: FormData) {
  const session = await requireCoord();
  const clientId = String(formData.get("clientId") ?? "");
  const totalMxn = Number(formData.get("totalMxn") ?? 0);
  const db = getDb();
  const n = await nextCompanyFolio(session.activeCompany.id, "INV");
  await db.insert(invoices).values({
    companyId: session.activeCompany.id,
    clientId,
    folio: `FAC-${n.padStart(4, "0")}`,
    totalMxn,
    isFreeInvoice: true,
    status: "BORRADOR",
  });
  revalidatePath("/app/finanzas");
}

export async function createRemissionAction(formData: FormData) {
  const session = await requireCoord();
  const clientId = String(formData.get("clientId") ?? "");
  const quoteId = String(formData.get("quoteId") ?? "") || null;
  const totalMxn = Number(formData.get("totalMxn") ?? 0);
  const allowsExit = formData.get("allowsExit") === "on";
  const db = getDb();
  const n = await nextCompanyFolio(session.activeCompany.id, "REM");
  const [rem] = await db
    .insert(remissions)
    .values({
      companyId: session.activeCompany.id,
      clientId,
      quoteId,
      folio: `REM-${n.padStart(4, "0")}`,
      totalMxn,
      allowsPhysicalExit: allowsExit,
      invoiceObligationRemains: true,
    })
    .returning();
  revalidateRemissionDetail(rem.id);
  await revalidateCommercialHub({ clientId, quoteId });
  redirect(`/app/finanzas/remisiones/${rem.id}`);
}

export async function registerPaymentAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canRegisterPayment(session)) throw new Error("Sin permiso");
  const invoiceId = String(formData.get("invoiceId") ?? "") || null;
  const amountMxn = Number(formData.get("amountMxn") ?? 0);
  const db = getDb();
  await db.insert(payments).values({
    companyId: session.activeCompany.id,
    invoiceId,
    amountMxn,
    validationStatus: "PENDIENTE_VALIDACION",
    createdByUserId: session.id,
  });
  if (invoiceId) revalidateInvoiceDetail(invoiceId);
  else revalidatePath("/app/finanzas");
}

export async function validatePaymentAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canValidatePayments(session)) throw new Error("Sin permiso");
  const paymentId = String(formData.get("paymentId") ?? "");
  const db = getDb();
  const [pay] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  await applyValidatedPayment(paymentId);
  await db
    .update(payments)
    .set({ validatedAt: sql`now()`, validatedByUserId: session.id })
    .where(eq(payments.id, paymentId));
  if (pay?.invoiceId) revalidateInvoiceDetail(pay.invoiceId);
  else revalidatePath("/app/finanzas");
}

export async function applyCustomerCreditAction(formData: FormData) {
  const session = await requireCoord();
  const clientId = String(formData.get("clientId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const amountMxn = Number(formData.get("amountMxn") ?? 0);
  const db = getDb();
  const [bal] = await db
    .select()
    .from(customerCreditBalances)
    .where(and(eq(customerCreditBalances.companyId, session.activeCompany.id), eq(customerCreditBalances.clientId, clientId)))
    .limit(1);
  if (!bal || bal.unappliedMxn < amountMxn) throw new Error("Crédito insuficiente");
  await db
    .update(customerCreditBalances)
    .set({ unappliedMxn: bal.unappliedMxn - amountMxn, updatedAt: sql`now()` })
    .where(eq(customerCreditBalances.id, bal.id));
  const [p] = await db
    .insert(payments)
    .values({
      companyId: session.activeCompany.id,
      invoiceId,
      amountMxn,
      validationStatus: "VALIDADO",
      validatedAt: sql`now()`,
      validatedByUserId: session.id,
      createdByUserId: session.id,
    })
    .returning();
  await applyValidatedPayment(p.id);
  revalidateInvoiceDetail(invoiceId);
}

export async function intercompanyInvoiceAction(formData: FormData) {
  const session = await requireCoord();
  if (session.activeCompany.code !== "SERVOMOTORES") throw new Error("Solo desde Servomotores");
  const amountMxn = Number(formData.get("amountMxn") ?? 0);
  const { companies } = await import("@/db/schema");
  const db = getDb();
  const [systron] = await db.select().from(companies).where(eq(companies.code, "SYSTRON")).limit(1);
  if (!systron) throw new Error("SYSTRON no configurado");
  await createIntercompanyInvoice(session.activeCompany.id, systron.id, amountMxn);
  revalidatePath("/app/finanzas");
}

export async function retryStampAction(formData: FormData) {
  const session = await requireCoord();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  await retryStampInvoice(invoiceId, session.activeCompany.id);
  revalidateInvoiceDetail(invoiceId);
}

export async function getFiscalIdentity(companyId: string) {
  const s = await getCompanySettings(companyId);
  return { fiscalLegalName: s.fiscalLegalName, fiscalRfc: s.fiscalRfc };
}

export async function listPendingPayments(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(payments)
    .where(and(eq(payments.companyId, companyId), eq(payments.validationStatus, "PENDIENTE_VALIDACION")))
    .limit(50);
}

export async function listReceivables(companyId: string) {
  const db = getDb();
  return db.select().from(receivableBalances).where(eq(receivableBalances.companyId, companyId)).limit(50);
}

export async function addCustomerCreditAction(formData: FormData) {
  const session = await requireCoord();
  const clientId = String(formData.get("clientId") ?? "");
  const amountMxn = Number(formData.get("amountMxn") ?? 0);
  const db = getDb();
  const [bal] = await db
    .select()
    .from(customerCreditBalances)
    .where(and(eq(customerCreditBalances.companyId, session.activeCompany.id), eq(customerCreditBalances.clientId, clientId)))
    .limit(1);
  if (bal) {
    await db
      .update(customerCreditBalances)
      .set({ unappliedMxn: bal.unappliedMxn + amountMxn, updatedAt: sql`now()` })
      .where(eq(customerCreditBalances.id, bal.id));
  } else {
    await db.insert(customerCreditBalances).values({
      companyId: session.activeCompany.id,
      clientId,
      unappliedMxn: amountMxn,
    });
  }
  revalidatePath("/app/finanzas");
}

export async function intercompanyPaymentAction(formData: FormData) {
  const session = await requireCoord();
  const amountMxn = Number(formData.get("amountMxn") ?? 0);
  const { companies } = await import("@/db/schema");
  const db = getDb();
  const [systron] = await db.select().from(companies).where(eq(companies.code, "SYSTRON")).limit(1);
  if (!systron) throw new Error("SYSTRON no configurado");
  const smId = session.activeCompany.code === "SERVOMOTORES" ? session.activeCompany.id : null;
  const syId = systron.id;
  if (session.activeCompany.code === "SYSTRON") {
    await applyIntercompanyPayment(
      (await db.select().from(companies).where(eq(companies.code, "SERVOMOTORES")).limit(1))[0]!.id,
      syId,
      amountMxn,
    );
  } else if (smId) {
    throw new Error("El pago SYSTRON→Servomotores se registra desde SYSTRON");
  }
  revalidatePath("/app/finanzas");
}

export async function listPendingReceipts(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(pendingReceipts)
    .where(and(eq(pendingReceipts.companyId, companyId), eq(pendingReceipts.status, "PENDIENTE")))
    .limit(50);
}

export async function registerPendingReceiptAction(formData: FormData) {
  const session = await requireCoord();
  const supplierId = String(formData.get("supplierId") ?? "");
  const amountMxn = Number(formData.get("amountMxn") ?? 0);
  const db = getDb();
  const n = await nextCompanyFolio(session.activeCompany.id, "EGR");
  const [eg] = await db
    .insert(cashDisbursements)
    .values({
      companyId: session.activeCompany.id,
      folio: `EGR-${n.padStart(4, "0")}`,
      amountMxn,
      description: "Pago pendiente de comprobación",
      supplierId,
    })
    .returning();
  await db.insert(pendingReceipts).values({
    companyId: session.activeCompany.id,
    supplierId,
    amountMxn,
    cashDisbursementId: eg.id,
  });
  revalidatePath("/app/finanzas/comprobaciones");
}

export async function regularizePendingReceiptAction(formData: FormData) {
  await requireCoord();
  const receiptId = String(formData.get("receiptId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "") || null;
  const db = getDb();
  await db
    .update(pendingReceipts)
    .set({ status: "REGULARIZADA", invoiceId })
    .where(eq(pendingReceipts.id, receiptId));
  revalidatePath("/app/finanzas/comprobaciones");
}

export async function requestCreditNoteAction(formData: FormData) {
  const session = await requireCoord();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const amountMxn = Number(formData.get("amountMxn") ?? 0);
  const db = getDb();
  await db.insert(creditNotes).values({
    companyId: session.activeCompany.id,
    invoiceId,
    amountMxn,
    status: "PENDIENTE_AUTORIZACION",
  });
  revalidatePath("/app/finanzas");
}

export async function authorizeCreditNoteAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["CEO", "ADMINISTRADOR"].includes(session.role)) throw new Error("Solo CEO/Admin");
  const noteId = String(formData.get("creditNoteId") ?? "");
  const db = getDb();
  await db
    .update(creditNotes)
    .set({ status: "AUTORIZADA", authorizedByUserId: session.id })
    .where(eq(creditNotes.id, noteId));
  revalidatePath("/app/finanzas");
}

export async function attachStoredDocumentAction(formData: FormData) {
  const session = await requireCoord();
  const entityType = String(formData.get("entityType") ?? "");
  const entityId = String(formData.get("entityId") ?? "");
  const fileName = String(formData.get("fileName") ?? "").trim();
  const storagePath = String(formData.get("storagePath") ?? "").trim();
  const db = getDb();
  await db.insert(storedDocuments).values({
    companyId: session.activeCompany.id,
    entityType,
    entityId,
    fileName,
    storagePath,
    uploadedByUserId: session.id,
  });
  revalidatePath("/app/finanzas");
}

export async function listCreditNotes(companyId: string) {
  const db = getDb();
  return db.select().from(creditNotes).where(eq(creditNotes.companyId, companyId)).limit(30);
}
