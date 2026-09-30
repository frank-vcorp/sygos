import type { CommercialDocumentData } from "@/lib/documents/commercial-document";
import type { QuoteDocumentData } from "@/lib/documents/types";

export function quoteToCommercialDocument(data: QuoteDocumentData): CommercialDocumentData {
  const validity = new Date(data.issuedAt);
  validity.setDate(validity.getDate() + data.validityDays);

  const totals: CommercialDocumentData["totals"] = [];
  if (data.discountMxn > 0) {
    totals.push({ label: "Subtotal", amountMxn: data.subtotalMxn });
    totals.push({
      label: `Descuento (${data.discountPercent}%)`,
      amountMxn: data.discountMxn,
      prefix: "− ",
    });
  }
  totals.push({ label: "Total MXN", amountMxn: data.totalMxn, emphasis: true });

  const detailParts = [data.originLabel];
  if (data.commercialReference) detailParts.push(`Ref. ${data.commercialReference}`);

  return {
    kindTitle: "Cotización",
    folio: data.folio,
    issuedAt: data.issuedAt,
    statusLabel: data.status,
    issuer: data.issuer,
    clientName: data.clientName,
    clientTaxId: data.clientTaxId,
    clientShippingAddress: data.clientShippingAddress,
    lines: [
      {
        description: data.concept,
        detail: detailParts.join(" · "),
        amountMxn: data.subtotalMxn,
      },
    ],
    totals,
    legalNote: `Precios en pesos mexicanos. Vigencia hasta ${validity.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })} (${data.validityDays} días naturales). Los tiempos de entrega y condiciones operativas se confirman al autorizar por escrito.`,
    footerTag: "Documento generado por Sygos",
  };
}
