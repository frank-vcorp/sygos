"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import {
  cashDisbursements,
  clients,
  creditNotes,
  customerCreditBalances,
  documentRequests,
  invoices,
  payments,
  pendingReceipts,
  receivableBalances,
  remissions,
  storedDocuments,
} from "@/db/schema";
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

export async function listDocumentRequests(companyId: string) {
  const db = getDb();
  return db.select().from(documentRequests).where(eq(documentRequests.companyId, companyId)).orderBy(desc(documentRequests.createdAt)).limit(50);
}

export async function listRemissions(companyId: string) {
  const db = getDb();
  return db.select().from(remissions).where(eq(remissions.companyId, companyId)).limit(50);
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
  revalidatePath("/app/finanzas");
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
  const totalMxn = Number(formData.get("totalMxn") ?? 0);
  const allowsExit = formData.get("allowsExit") === "on";
  const db = getDb();
  const n = await nextCompanyFolio(session.activeCompany.id, "REM");
  await db
    .insert(remissions)
    .values({
      companyId: session.activeCompany.id,
      clientId,
      folio: `REM-${n.padStart(4, "0")}`,
      totalMxn,
      allowsPhysicalExit: allowsExit,
      invoiceObligationRemains: true,
    });
  revalidatePath("/app/finanzas");
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
  revalidatePath("/app/finanzas");
}

export async function validatePaymentAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canValidatePayments(session)) throw new Error("Sin permiso");
  const paymentId = String(formData.get("paymentId") ?? "");
  const db = getDb();
  await applyValidatedPayment(paymentId);
  await db
    .update(payments)
    .set({ validatedAt: sql`now()`, validatedByUserId: session.id })
    .where(eq(payments.id, paymentId));
  revalidatePath("/app/finanzas");
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
  revalidatePath("/app/finanzas");
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
  revalidatePath("/app/finanzas");
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
