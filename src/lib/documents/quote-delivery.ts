import { buildCommercialDeliveryPackage, buildCommercialPrintHtml } from "@/lib/documents/commercial-delivery";
import { quoteToCommercialDocument } from "@/lib/documents/map-quote-commercial";
import { formatMxn } from "@/lib/documents/format";
import { loadQuoteDocumentData } from "@/lib/documents/load-quote-document";
import type { DocumentEmailPackage } from "@/lib/documents/types";

export async function buildQuoteDeliveryPackage(
  companyId: string,
  quoteId: string,
  recipientName: string,
): Promise<DocumentEmailPackage | null> {
  const data = await loadQuoteDocumentData(companyId, quoteId);
  if (!data) return null;

  const commercial = quoteToCommercialDocument(data);

  return buildCommercialDeliveryPackage({
    data: commercial,
    documentUrl: data.documentUrl,
    recipientName,
    emailSubject: `Cotización ${data.folio} — ${data.issuer.displayName}`,
    documentLabel: `Cotización ${data.folio}`,
    pdfFilenamePrefix: "Cotizacion",
    introSentence: `Compartimos la cotización por un total de ${formatMxn(data.totalMxn)}.`,
    footerNote: "Si no esperaba este correo, ignore el mensaje o contacte a su ejecutivo comercial.",
  });
}

export async function buildQuotePrintHtml(companyId: string, quoteId: string) {
  const data = await loadQuoteDocumentData(companyId, quoteId);
  if (!data) return null;
  return buildCommercialPrintHtml(quoteToCommercialDocument(data));
}
