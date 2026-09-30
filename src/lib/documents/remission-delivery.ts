import { buildCommercialPrintHtml } from "@/lib/documents/commercial-delivery";
import { loadRemissionCommercialDocument } from "@/lib/documents/load-remission-document";

export async function buildRemissionPrintHtml(companyId: string, remissionId: string) {
  const payload = await loadRemissionCommercialDocument(companyId, remissionId);
  if (!payload) return null;
  return buildCommercialPrintHtml(payload.commercial);
}
