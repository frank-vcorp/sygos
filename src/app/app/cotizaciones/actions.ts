"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { clientContacts, quotePriceRevisions, quoteSendContacts, quotes, users } from "@/db/schema";
import { nextCompanyFolio } from "@/lib/folio";
import { propagateClientDecisionToLinkedQuote } from "@/lib/quote-link";
import { canApplyQuoteDiscount, canSetQuotePrice } from "@/lib/permissions-commercial";
import { isUserInTestMode, logTestMutation } from "@/lib/test-mode-guard";
import { deliverDocument } from "@/lib/document-delivery";
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
  const test = await isUserInTestMode(session.id);
  const n = await nextCompanyFolio(session.activeCompany.id, "QUOTE", { testMode: test.active });
  const folio = `COT-${n.padStart(4, "0")}`;
  const db = getDb();
  const [row] = await db.insert(quotes).values({
    companyId: session.activeCompany.id,
    clientId,
    folio,
    status: "BORRADOR",
    pendingPricing: true,
    pendingOrigin: "COTIZACION_INICIADA",
    commercialReference: String(formData.get("commercialReference") ?? "").trim() || null,
    createdByUserId: session.id,
  }).returning();
  if (test.sessionId) await logTestMutation(test.sessionId, "quotes", row.id);
  revalidatePath("/app/cotizaciones");
  redirect(`/app/cotizaciones/${row.id}`);
}

export async function createSpecialCommercialQuoteAction(formData: FormData) {
  const session = await requireCommercial();
  const origin = String(formData.get("origin") ?? "VENTA_EQUIPO") as "VENTA_EQUIPO" | "SERVICIO_EN_CAMPO";
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) throw new Error("Cliente requerido");
  const test = await isUserInTestMode(session.id);
  const n = await nextCompanyFolio(session.activeCompany.id, "QUOTE", { testMode: test.active });
  const db = getDb();
  const [row] = await db.insert(quotes).values({
    companyId: session.activeCompany.id,
    clientId,
    folio: `COT-${n.padStart(4, "0")}`,
    status: "BORRADOR",
    pendingPricing: true,
    pendingOrigin: origin,
    createdByUserId: session.id,
  }).returning();
  if (test.sessionId) await logTestMutation(test.sessionId, "quotes", row.id);
  revalidatePath(origin === "VENTA_EQUIPO" ? "/app/ventas/equipo" : "/app/ventas/campo");
  redirect(`/app/cotizaciones/${row.id}`);
}

export async function recordQuoteClientDecisionAction(formData: FormData) {
  const session = await requireCommercial();
  const quoteId = String(formData.get("quoteId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "AUTORIZADA" | "RECHAZADA";
  if (!["AUTORIZADA", "RECHAZADA"].includes(decision)) throw new Error("Decisión inválida");
  const db = getDb();
  await db
    .update(quotes)
    .set({ status: decision })
    .where(and(eq(quotes.id, quoteId), eq(quotes.companyId, session.activeCompany.id)));
  if (session.activeCompany.code === "SYSTRON") {
    await propagateClientDecisionToLinkedQuote(quoteId, decision);
  }
  revalidatePath(`/app/cotizaciones/${quoteId}`);
}

export async function sendQuoteAction(formData: FormData) {
  const session = await requireCommercial();
  const quoteId = String(formData.get("quoteId") ?? "");
  const contactIds = formData.getAll("contactIds").map(String).filter(Boolean);
  const sendEmail = formData.get("sendEmail") === "on";
  const sendWhatsapp = formData.get("sendWhatsapp") === "on";
  if (!quoteId || contactIds.length === 0) throw new Error("Selecciona al menos un contacto");
  if (!sendEmail && !sendWhatsapp) throw new Error("Elige al menos un canal: correo o WhatsApp");

  const db = getDb();
  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), eq(quotes.companyId, session.activeCompany.id)))
    .limit(1);
  if (!quote) throw new Error("Cotización no encontrada");
  if (!quote.finalPriceMxn && !quote.priceMxn) throw new Error("CEO/Administrador debe fijar precio antes de enviar");

  const contacts = await db
    .select()
    .from(clientContacts)
    .where(and(eq(clientContacts.clientId, quote.clientId), inArray(clientContacts.id, contactIds)));

  const price = quote.finalPriceMxn ?? quote.priceMxn ?? 0;
  const subject = `Cotización ${quote.folio}`;
  const body = `Hola,\n\nAdjuntamos la cotización ${quote.folio} por $${price.toLocaleString("es-MX")} MXN.\n\nSaludos,\n${session.activeCompany.displayName}`;

  for (const contactId of contactIds) {
    await db.insert(quoteSendContacts).values({ quoteId, contactId });
  }

  const errors: string[] = [];
  let successCount = 0;

  for (const contact of contacts) {
    if (sendEmail) {
      const result = await deliverDocument({
        companyId: session.activeCompany.id,
        channel: "EMAIL",
        entityType: "QUOTE",
        entityId: quoteId,
        contactId: contact.id,
        recipientName: contact.name,
        recipientEmail: contact.email,
        recipientPhone: contact.phone,
        subject,
        body,
        createdByUserId: session.id,
      });
      if (result.ok) successCount += 1;
      else errors.push(`${contact.name} (correo): ${result.error}`);
    }
    if (sendWhatsapp) {
      const result = await deliverDocument({
        companyId: session.activeCompany.id,
        channel: "WHATSAPP",
        entityType: "QUOTE",
        entityId: quoteId,
        contactId: contact.id,
        recipientName: contact.name,
        recipientEmail: contact.email,
        recipientPhone: contact.phone,
        subject,
        body,
        createdByUserId: session.id,
      });
      if (result.ok) successCount += 1;
      else errors.push(`${contact.name} (WhatsApp): ${result.error}`);
    }
  }

  if (successCount === 0) {
    throw new Error(errors.join(" · ") || "No se pudo enviar por ningún canal");
  }

  await db
    .update(quotes)
    .set({ status: "ENVIADA", pendingPricing: false })
    .where(eq(quotes.id, quoteId));

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

export async function setQuotePriceAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canSetQuotePrice(session.role)) throw new Error("Solo CEO/Administrador fija precio");
  const quoteId = String(formData.get("quoteId") ?? "");
  const priceMxn = Number(formData.get("priceMxn") ?? 0);
  const supplierCost = Number(formData.get("systronSupplierCostMxn") ?? 0) || null;
  if (!quoteId || priceMxn < 0) throw new Error("Precio inválido");
  const db = getDb();
  await db.insert(quotePriceRevisions).values({ quoteId, priceMxn, authorUserId: session.id });
  await db
    .update(quotes)
    .set({
      priceMxn,
      finalPriceMxn: priceMxn,
      pendingPricing: false,
      status: "PENDIENTE_PRECIO",
      systronSupplierCostMxn: supplierCost,
    })
    .where(and(eq(quotes.id, quoteId), eq(quotes.companyId, session.activeCompany.id)));
  revalidatePath(`/app/cotizaciones/${quoteId}`);
  revalidatePath("/app/cotizaciones/pendientes");
}

export async function applyQuoteDiscountAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canApplyQuoteDiscount(session.role)) throw new Error("Sin permiso");
  const quoteId = String(formData.get("quoteId") ?? "");
  const discount = Number(formData.get("discountPercent") ?? 0);
  const db = getDb();
  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), eq(quotes.companyId, session.activeCompany.id)))
    .limit(1);
  if (!quote || quote.priceMxn == null) throw new Error("Precio no definido");
  if (session.role === "VENTAS_SYSTRON") {
    const [u] = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
    const max = u?.maxDiscountPercent ?? 0;
    if (discount > max) throw new Error(`Descuento máximo permitido: ${max}%`);
  }
  const finalPriceMxn = Math.round(quote.priceMxn * (1 - discount / 100));
  await db
    .update(quotes)
    .set({ discountPercent: discount, finalPriceMxn })
    .where(eq(quotes.id, quoteId));
  revalidatePath(`/app/cotizaciones/${quoteId}`);
}

export async function authorizeWithoutEquipmentAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canSetQuotePrice(session.role)) throw new Error("Sin permiso");
  const quoteId = String(formData.get("quoteId") ?? "");
  const db = getDb();
  await db
    .update(quotes)
    .set({ status: "AUTORIZADA_PENDIENTE_INGRESO_EQUIPO", authorizedWithoutEquipment: true })
    .where(and(eq(quotes.id, quoteId), eq(quotes.companyId, session.activeCompany.id)));
  revalidatePath(`/app/cotizaciones/${quoteId}`);
}
