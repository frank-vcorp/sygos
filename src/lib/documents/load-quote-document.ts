import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clients, companies, quotes } from "@/db/schema";
import { getPublicAppUrl } from "@/lib/documents/app-url";
import { loadIssuerBrand } from "@/lib/documents/load-issuer";
import { QUOTE_ORIGIN_LABEL } from "@/lib/documents/quote-origin";
import type { QuoteDocumentData } from "@/lib/documents/types";

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
  const concept = row.quote.commercialReference?.trim() || originLabel;

  const baseUrl = getPublicAppUrl();

  return {
    folio: row.quote.folio,
    issuedAt: row.quote.createdAt,
    status: row.quote.status,
    originLabel,
    commercialReference: row.quote.commercialReference,
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
