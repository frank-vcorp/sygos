"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { invoices, payments } from "@/db/schema";
import { nextCompanyFolio } from "@/lib/folio";
import { getSession } from "@/lib/session";

async function requireFinance() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  const ok =
    session.role === "ADMINISTRADOR" ||
    session.role === "CEO" ||
    session.role === "COORDINACION_ADMIN";
  if (!ok) throw new Error("Sin permiso");
  return session;
}

export async function listInvoices(companyId: string) {
  const db = getDb();
  return db.select().from(invoices).where(eq(invoices.companyId, companyId)).orderBy(desc(invoices.createdAt)).limit(100);
}

export async function createInvoiceAction(formData: FormData) {
  const session = await requireFinance();
  const clientId = String(formData.get("clientId") ?? "");
  const totalMxn = Number(formData.get("totalMxn") ?? 0);
  const n = await nextCompanyFolio(session.activeCompany.id, "INV");
  const folio = `FAC-${n.padStart(4, "0")}`;
  const db = getDb();
  await db.insert(invoices).values({
    companyId: session.activeCompany.id,
    clientId,
    folio,
    totalMxn,
    status: "BORRADOR",
  });
  revalidatePath("/app/finanzas");
}

export async function registerPaymentAction(formData: FormData) {
  const session = await requireFinance();
  const invoiceId = String(formData.get("invoiceId") ?? "") || null;
  const amountMxn = Number(formData.get("amountMxn") ?? 0);
  const db = getDb();
  await db.insert(payments).values({
    companyId: session.activeCompany.id,
    invoiceId,
    amountMxn,
    createdByUserId: session.id,
  });
  revalidatePath("/app/finanzas");
}
