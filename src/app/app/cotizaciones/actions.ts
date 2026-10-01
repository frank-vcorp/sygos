"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import {
  attendances,
  clientContacts,
  clients,
  companies,
  diagnoses,
  equiUnits,
  motUnits,
  quotePriceRevisions,
  quoteSendContacts,
  quotes,
  repairs,
  serviceOrders,
  users,
} from "@/db/schema";
import { nextCompanyFolio } from "@/lib/folio";
import { propagateClientDecisionToLinkedQuote } from "@/lib/quote-link";
import { canApplyQuoteDiscount, canEditQuoteCommercialContext, canSetQuotePrice } from "@/lib/permissions-commercial";
import {
  assertIntendedContacts,
  assertQuoteCommercialEquipment,
  parseQuoteCommercialFormData,
  replaceQuoteCommercialDetails,
} from "@/lib/quote-commercial-persist";
import { listQuoteIntendedContacts, listQuoteLines } from "@/lib/quote-commercial-queries";
import { isUserInTestMode, logTestMutation } from "@/lib/test-mode-guard";
import { deliverDocument } from "@/lib/document-delivery";
import { buildQuoteDeliveryPackage } from "@/lib/documents/quote-delivery";
import { revalidateCommercialHub } from "@/lib/revalidate-commercial-hub";
import type { SessionUser } from "@/lib/session";
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

/** Staging UAT: marcar ENVIADA aunque SendGrid/WhatsApp fallen (p. ej. API key inválida). */
async function allowQuoteSendWithoutDelivery() {
  if (process.env.SYGOS_RELAX_QUOTE_SEND === "1") return true;
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").toLowerCase();
  if (host.includes("systronia.com")) return true;
  const fqdn = process.env.COOLIFY_FQDN?.trim() ?? "";
  const publicUrl = process.env.SYGOS_PUBLIC_URL?.trim() ?? "";
  const coolifyUrl = process.env.COOLIFY_URL?.trim() ?? "";
  return (
    fqdn === "sygos.systronia.com" ||
    publicUrl.includes("systronia.com") ||
    coolifyUrl.includes("systronia.com")
  );
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

export async function listQuotesWithClients(companyId: string) {
  const db = getDb();
  return db
    .select({
      quote: quotes,
      clientName: clients.name,
    })
    .from(quotes)
    .innerJoin(clients, eq(quotes.clientId, clients.id))
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

export async function listQuotesForClient(clientId: string, companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(quotes)
    .where(and(eq(quotes.clientId, clientId), eq(quotes.companyId, companyId)))
    .orderBy(desc(quotes.createdAt))
    .limit(50);
}

async function insertCommercialQuote(session: SessionUser, formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) throw new Error("Cliente requerido");
  const pendingOriginRaw = String(formData.get("pendingOrigin") ?? "COTIZACION_INICIADA");
  const pendingOrigin = pendingOriginRaw as
    | "COTIZACION_INICIADA"
    | "VENTA_EQUIPO"
    | "SERVICIO_EN_CAMPO";
  const parsed = parseQuoteCommercialFormData(formData);
  const db = getDb();
  await assertQuoteCommercialEquipment(
    db,
    session.activeCompany.id,
    session.activeCompany.code,
    clientId,
    parsed,
  );
  await assertIntendedContacts(db, clientId, parsed.intendedContactIds);

  const test = await isUserInTestMode(session.id);
  const n = await nextCompanyFolio(session.activeCompany.id, "QUOTE", { testMode: test.active });
  const folio = `COT-${n.padStart(4, "0")}`;
  const [row] = await db
    .insert(quotes)
    .values({
      companyId: session.activeCompany.id,
      clientId,
      folio,
      status: "BORRADOR",
      pendingPricing: true,
      pendingOrigin,
      createdByUserId: session.id,
    })
    .returning();
  await replaceQuoteCommercialDetails(db, row.id, parsed);
  if (test.sessionId) await logTestMutation(test.sessionId, "quotes", row.id);
  return { row, pendingOrigin };
}

export async function createQuoteAction(formData: FormData) {
  const session = await requireCommercial();
  const { row } = await insertCommercialQuote(session, formData);
  revalidatePath("/app/cotizaciones");
  redirect(`/app/cotizaciones/${row.id}`);
}

/** Venta equipo / servicio en campo — mismo cuerpo comercial §20.3. */
export async function createSpecialCommercialQuoteAction(formData: FormData) {
  const session = await requireCommercial();
  const origin = String(formData.get("pendingOrigin") ?? formData.get("origin") ?? "VENTA_EQUIPO");
  formData.set("pendingOrigin", origin);
  const { row, pendingOrigin } = await insertCommercialQuote(session, formData);
  revalidatePath(pendingOrigin === "VENTA_EQUIPO" ? "/app/ventas/equipo" : "/app/ventas/campo");
  redirect(`/app/cotizaciones/${row.id}`);
}

export async function updateQuoteCommercialContextAction(formData: FormData) {
  const session = await requireCommercial();
  const quoteId = String(formData.get("quoteId") ?? "");
  if (!quoteId) throw new Error("Cotización no válida");
  const db = getDb();
  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), eq(quotes.companyId, session.activeCompany.id)))
    .limit(1);
  if (!quote) throw new Error("Cotización no encontrada");
  if (!canEditQuoteCommercialContext(session.role, quote)) {
    throw new Error("Ya no puedes editar el contexto comercial de esta cotización");
  }
  const parsed = parseQuoteCommercialFormData(formData);
  await assertQuoteCommercialEquipment(
    db,
    session.activeCompany.id,
    session.activeCompany.code,
    quote.clientId,
    parsed,
  );
  await assertIntendedContacts(db, quote.clientId, parsed.intendedContactIds);
  await replaceQuoteCommercialDetails(db, quoteId, parsed);
  revalidatePath(`/app/cotizaciones/${quoteId}`);
  revalidatePath("/app/cotizaciones/pendientes");
}

export { listQuoteLines, listQuoteIntendedContacts };

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
  await revalidateCommercialHub({ quoteId });
}

export async function sendQuoteAction(formData: FormData) {
  const session = await requireCommercial();
  const quoteId = String(formData.get("quoteId") ?? "");
  const contactIds = formData.getAll("contactIds").map(String).filter(Boolean);
  const sendEmail = formData.get("sendEmail") === "on";
  const sendWhatsapp = formData.get("sendWhatsapp") === "on";
  if (!quoteId) throw new Error("Cotización no válida");

  const db = getDb();
  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), eq(quotes.companyId, session.activeCompany.id)))
    .limit(1);
  if (!quote) throw new Error("Cotización no encontrada");
  if (!quote.finalPriceMxn && !quote.priceMxn) throw new Error("CEO/Administrador debe fijar precio antes de enviar");

  const [clientRow] = await db
    .select({ isIntercompany: clients.isIntercompany })
    .from(clients)
    .where(eq(clients.id, quote.clientId))
    .limit(1);

  if (contactIds.length === 0) {
    if (clientRow?.isIntercompany && (await allowQuoteSendWithoutDelivery())) {
      await db
        .update(quotes)
        .set({ status: "ENVIADA", pendingPricing: false })
        .where(eq(quotes.id, quoteId));
      revalidatePath(`/app/cotizaciones/${quoteId}`);
      revalidatePath("/app/cotizaciones/pendientes");
      await revalidateCommercialHub({ quoteId });
      return;
    }
    throw new Error("Selecciona al menos un contacto");
  }
  if (!sendEmail && !sendWhatsapp) throw new Error("Elige al menos un canal: correo o WhatsApp");

  const markQuoteSent = async () => {
    await db
      .update(quotes)
      .set({ status: "ENVIADA", pendingPricing: false })
      .where(eq(quotes.id, quoteId));
    revalidatePath(`/app/cotizaciones/${quoteId}`);
    revalidatePath("/app/cotizaciones/pendientes");
  };

  try {
    const contacts = await db
      .select()
      .from(clientContacts)
      .where(and(eq(clientContacts.clientId, quote.clientId), inArray(clientContacts.id, contactIds)));
    if (contacts.length !== contactIds.length) {
      throw new Error("Uno o más contactos no son válidos para este cliente");
    }

    for (const contactId of contactIds) {
      await db.insert(quoteSendContacts).values({ quoteId, contactId });
    }

    const errors: string[] = [];
    let successCount = 0;

    for (const contact of contacts) {
      try {
        const package_ = await buildQuoteDeliveryPackage(
          session.activeCompany.id,
          quoteId,
          contact.name,
        );
        if (!package_) {
          errors.push(`${contact.name}: No se pudo generar el documento de cotización`);
          continue;
        }

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
            subject: package_.subject,
            body: package_.plainText,
            html: package_.html,
            attachments: package_.attachments,
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
            subject: package_.subject,
            body: package_.plainText,
            whatsappBody: package_.whatsappBody ?? package_.plainText,
            createdByUserId: session.id,
          });
          if (result.ok) successCount += 1;
          else errors.push(`${contact.name} (WhatsApp): ${result.error}`);
        }
      } catch (err) {
        errors.push(
          `${contact.name}: ${err instanceof Error ? err.message : "Error al enviar documento"}`,
        );
      }
    }

    if (successCount === 0) {
      const stagingWithoutIntegration =
        errors.length > 0 &&
        errors.every((e) =>
          /SendGrid no configurado|WhatsApp no vinculado|no tiene correo|no tiene teléfono/i.test(e),
        );
      const allChannelsFailed =
        errors.length > 0 && errors.every((e) => /\(correo\)|\(WhatsApp\)|:/.test(e));
      const relaxStaging =
        (await allowQuoteSendWithoutDelivery()) && (allChannelsFailed || errors.length === 0);
      if (!stagingWithoutIntegration && !relaxStaging) {
        throw new Error(errors.join(" · ") || "No se pudo enviar por ningún canal");
      }
    }

    await markQuoteSent();
  } catch (err) {
    if (await allowQuoteSendWithoutDelivery()) {
      await markQuoteSent();
      return;
    }
    throw err;
  }
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

function quoteCompanyScope(session: SessionUser) {
  const multiCompany =
    session.role === "ADMINISTRADOR" ||
    session.role === "CEO" ||
    session.role === "COORDINACION_ADMIN";
  if (multiCompany && session.allowedCompanies.length > 0) {
    return inArray(quotes.companyId, session.allowedCompanies.map((c) => c.id));
  }
  return eq(quotes.companyId, session.activeCompany.id);
}

export async function getQuoteDetailForSession(session: SessionUser, id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      quote: quotes,
      clientName: clients.name,
      clientId: clients.id,
      clientIsIntercompany: clients.isIntercompany,
    })
    .from(quotes)
    .innerJoin(clients, eq(quotes.clientId, clients.id))
    .where(and(eq(quotes.id, id), quoteCompanyScope(session)))
    .limit(1);
  if (!row) return null;
  return {
    ...row.quote,
    clientName: row.clientName,
    clientId: row.clientId,
    clientIsIntercompany: row.clientIsIntercompany,
  };
}

export async function getQuoteForAttendance(attendanceId: string, companyId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.attendanceId, attendanceId), eq(quotes.companyId, companyId)))
    .limit(1);
  return row ?? null;
}

export async function getIntercompanyQuotePartner(quoteId: string) {
  const db = getDb();
  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!q) return null;

  let partnerId = q.linkedQuoteId;
  if (!partnerId) {
    const [reverse] = await db
      .select({ id: quotes.id })
      .from(quotes)
      .where(eq(quotes.linkedQuoteId, quoteId))
      .limit(1);
    partnerId = reverse?.id ?? null;
  }
  if (!partnerId) return null;

  const [partner] = await db
    .select({
      id: quotes.id,
      folio: quotes.folio,
      companyId: quotes.companyId,
      companyCode: companies.code,
    })
    .from(quotes)
    .innerJoin(companies, eq(quotes.companyId, companies.id))
    .where(eq(quotes.id, partnerId))
    .limit(1);
  return partner ?? null;
}

export async function getQuoteOriginLinks(attendanceId: string | null) {
  if (!attendanceId) return null;
  const db = getDb();
  const [att] = await db.select().from(attendances).where(eq(attendances.id, attendanceId)).limit(1);
  if (!att) return null;
  let equiFolio: string | null = null;
  let motFolio: string | null = null;
  if (att.equiId) {
    const [e] = await db.select({ folio: equiUnits.folio }).from(equiUnits).where(eq(equiUnits.id, att.equiId)).limit(1);
    equiFolio = e?.folio ?? null;
  }
  if (att.motId) {
    const [m] = await db.select({ folio: motUnits.folio }).from(motUnits).where(eq(motUnits.id, att.motId)).limit(1);
    motFolio = m?.folio ?? null;
  }

  const osRows = await db
    .select({ id: serviceOrders.id, folio: serviceOrders.folio, status: serviceOrders.status })
    .from(serviceOrders)
    .where(eq(serviceOrders.attendanceId, attendanceId));

  const [diag] = await db
    .select({ id: diagnoses.id, status: diagnoses.status })
    .from(diagnoses)
    .where(eq(diagnoses.attendanceId, attendanceId))
    .limit(1);

  const [repair] = await db
    .select({ id: repairs.id, status: repairs.status })
    .from(repairs)
    .where(eq(repairs.attendanceId, attendanceId))
    .limit(1);

  return {
    attendanceId: att.id,
    attentionType: att.attentionType,
    equiId: att.equiId,
    equiFolio,
    motId: att.motId,
    motFolio,
    serviceOrders: osRows,
    diagnosisId: diag?.id ?? null,
    diagnosisStatus: diag?.status ?? null,
    repairId: repair?.id ?? null,
    repairStatus: repair?.status ?? null,
  };
}

/** @deprecated Use getQuoteDetailForSession */
export async function getQuoteDetail(companyId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      quote: quotes,
      clientName: clients.name,
      clientId: clients.id,
    })
    .from(quotes)
    .innerJoin(clients, eq(quotes.clientId, clients.id))
    .where(and(eq(quotes.id, id), eq(quotes.companyId, companyId)))
    .limit(1);
  if (!row) return null;
  return { ...row.quote, clientName: row.clientName, clientId: row.clientId };
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
  await revalidateCommercialHub({ quoteId });
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
