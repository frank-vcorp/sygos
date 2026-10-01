import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clients, companies, equiUnits, motUnits, quotes } from "@/db/schema";
import { getPublicAppUrl } from "@/lib/documents/app-url";
import { loadIssuerBrand } from "@/lib/documents/load-issuer";
import { QUOTE_ORIGIN_LABEL } from "@/lib/documents/quote-origin";
import type { QuoteDocumentData } from "@/lib/documents/types";
import { listQuoteLines } from "@/lib/quote-commercial-queries";
import { QUOTE_LINE_KIND_LABEL, QUOTE_OFFER_TYPE_LABEL } from "@/lib/quote-commercial-labels";

export async function loadQuoteDocumentData(companyId: string, quoteId: string): Promise<QuoteDocumentData | null> {
  const db = getDb();
  const [row] = await db
    .select({
      quote: quotes,
      client: clients,
      company: companies,
    })
    .from(quotes)
    .innerJoin(clients, eq(quotes.clientId, clients.id))
    .innerJoin(companies, eq(quotes.companyId, companies.id))
    .where(and(eq(quotes.id, quoteId), eq(quotes.companyId, companyId)))
    .limit(1);

  if (!row) return null;

  const issuer = await loadIssuerBrand(companyId);
  const discountPercent = row.quote.discountPercent ?? 0;
  const basePrice = row.quote.priceMxn ?? row.quote.finalPriceMxn ?? 0;
  const discountMxn = discountPercent > 0 ? Math.round((basePrice * discountPercent) / 100) : 0;
  const subtotalMxn = basePrice;
  const totalMxn = row.quote.finalPriceMxn ?? basePrice - discountMxn;
  const originKey = row.quote.pendingOrigin ?? "COTIZACION_INICIADA";
  const originLabel = QUOTE_ORIGIN_LABEL[originKey] ?? originKey;
  const offerTypeLabel = row.quote.offerType ? QUOTE_OFFER_TYPE_LABEL[row.quote.offerType] : null;

  const lineRows = await listQuoteLines(quoteId);
  const requestLines = lineRows.map((l) => ({
    kind: QUOTE_LINE_KIND_LABEL[l.kind] ?? l.kind,
    description: l.description,
    quantity: l.quantity,
  }));

  let equipmentSummary: string | null = null;
  if (row.quote.equiId) {
    const [e] = await db
      .select({ folio: equiUnits.folio, brand: equiUnits.brand, model: equiUnits.model })
      .from(equiUnits)
      .where(eq(equiUnits.id, row.quote.equiId))
      .limit(1);
    if (e) equipmentSummary = `EQUI ${e.folio} · ${e.brand ?? "—"} ${e.model}`;
  } else if (row.quote.motId) {
    const [m] = await db
      .select({ folio: motUnits.folio, brand: motUnits.brand, model: motUnits.model })
      .from(motUnits)
      .where(eq(motUnits.id, row.quote.motId))
      .limit(1);
    if (m) equipmentSummary = `MOT ${m.folio} · ${m.brand ?? "—"} ${m.model}`;
  } else {
    const parts = [
      row.quote.preliminaryBrand,
      row.quote.preliminaryModel,
      row.quote.preliminarySerial ? `Serie ${row.quote.preliminarySerial}` : null,
      row.quote.preliminaryNotes,
    ].filter(Boolean);
    if (parts.length) equipmentSummary = parts.join(" · ");
  }

  const concept =
    requestLines.length > 0
      ? requestLines.map((l) => `${l.quantity}× ${l.description}`).join("; ")
      : row.quote.commercialReference?.trim() || originLabel;

  const baseUrl = getPublicAppUrl();

  return {
    folio: row.quote.folio,
    issuedAt: row.quote.createdAt,
    status: row.quote.status,
    originLabel,
    offerTypeLabel,
    commercialReference: row.quote.commercialReference,
    commercialNotes: row.quote.commercialNotes,
    equipmentSummary,
    requestLines,
    clientName: row.client.name,
    clientTaxId: row.client.taxIdentity,
    clientShippingAddress: row.client.shippingAddress,
    subtotalMxn,
    discountPercent,
    discountMxn,
    totalMxn,
    concept,
    validityDays: 15,
    issuer,
    documentUrl: `${baseUrl}/api/documents/cotizacion/${quoteId}`,
  };
}
