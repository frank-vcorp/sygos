import { buildCommercialPrintHtml } from "@/lib/documents/commercial-delivery";
import { loadInvoiceCommercialDocument } from "@/lib/documents/load-invoice-document";

export async function buildInvoicePrintHtml(companyId: string, invoiceId: string) {
  const payload = await loadInvoiceCommercialDocument(companyId, invoiceId);
  if (!payload) return null;
  return buildCommercialPrintHtml(payload.commercial);
}
