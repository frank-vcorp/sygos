"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { clientContacts, quoteSendContacts, quotes } from "@/db/schema";
import { nextCompanyFolio } from "@/lib/folio";
import { getSession } from "@/lib/session";

async function requireCommercial() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  const ok =
    session.role === "ADMINISTRADOR" ||
    session.role === "CEO" ||
    session.role === "VENTAS_SYSTRON" ||
    session.role === "GERENTE_OPERATIVO_SERVOMOTORES";
  if (!ok) throw new Error("Sin permiso");
  return session;
}

export async function listQuotes(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(quotes)
    .where(eq(quotes.companyId, companyId))
    .orderBy(desc(quotes.createdAt))
    .limit(200);
}

export async function listPendingQuote(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(quotes)
    .where(and(eq(quotes.companyId, companyId), eq(quotes.pendingPricing, true)))
    .orderBy(desc(quotes.createdAt));
}

export async function createQuoteAction(formData: FormData) {
  const session = await requireCommercial();
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) throw new Error("Cliente requerido");
  const n = await nextCompanyFolio(session.activeCompany.id, "QUOTE");
  const folio = `COT-${n.padStart(4, "0")}`;
  const db = getDb();
  const [row] = await db.insert(quotes).values({
    companyId: session.activeCompany.id,
    clientId,
    folio,
    status: "BORRADOR",
    pendingPricing: true,
    commercialReference: String(formData.get("commercialReference") ?? "").trim() || null,
    createdByUserId: session.id,
  }).returning();
  revalidatePath("/app/cotizaciones");
  redirect(`/app/cotizaciones/${row.id}`);
}

export async function sendQuoteAction(formData: FormData) {
  const session = await requireCommercial();
  const quoteId = String(formData.get("quoteId") ?? "");
  const contactIds = formData.getAll("contactIds").map(String).filter(Boolean);
  if (!quoteId || contactIds.length === 0) throw new Error("Selecciona al menos un contacto");

  const db = getDb();
  for (const contactId of contactIds) {
    await db.insert(quoteSendContacts).values({ quoteId, contactId });
  }
  await db
    .update(quotes)
    .set({ status: "ENVIADA", pendingPricing: false })
    .where(and(eq(quotes.id, quoteId), eq(quotes.companyId, session.activeCompany.id)));

  revalidatePath(`/app/cotizaciones/${quoteId}`);
  revalidatePath("/app/cotizaciones/pendientes");
}

export async function getQuote(companyId: string, id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.companyId, companyId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listContactsForClient(clientId: string) {
  const db = getDb();
  return db.select().from(clientContacts).where(and(eq(clientContacts.clientId, clientId), eq(clientContacts.active, true)));
}
