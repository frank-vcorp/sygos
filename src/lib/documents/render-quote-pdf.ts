import { quoteToCommercialDocument } from "@/lib/documents/map-quote-commercial";
import { renderCommercialPdfBuffer } from "@/lib/documents/render-commercial-pdf";
import type { QuoteDocumentData } from "@/lib/documents/types";

export async function renderQuotePdfBuffer(data: QuoteDocumentData): Promise<Buffer> {
  return renderCommercialPdfBuffer(quoteToCommercialDocument(data));
}
