import { buildCommercialPrintHtml } from "@/lib/documents/commercial-delivery";
import { renderCommercialDocumentBody } from "@/lib/documents/commercial-document";
import { quoteToCommercialDocument } from "@/lib/documents/map-quote-commercial";
import type { QuoteDocumentData } from "@/lib/documents/types";

export function renderQuoteDocumentHtml(data: QuoteDocumentData, options?: { forPrint?: boolean }) {
  const commercial = quoteToCommercialDocument(data);
  if (options?.forPrint) {
    return buildCommercialPrintHtml(commercial);
  }
  return renderCommercialDocumentBody(commercial);
}
