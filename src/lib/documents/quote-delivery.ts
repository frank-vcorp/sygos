import { wrapEmailHtml } from "@/lib/documents/email-shell";
import { escapeHtml } from "@/lib/documents/escape";
import { formatMxn } from "@/lib/documents/format";
import { loadQuoteDocumentData } from "@/lib/documents/load-quote-document";
import { renderQuoteDocumentHtml } from "@/lib/documents/render-quote-html";
import { renderQuotePdfBuffer } from "@/lib/documents/render-quote-pdf";
import type { DocumentEmailPackage } from "@/lib/documents/types";

export async function buildQuoteDeliveryPackage(
  companyId: string,
  quoteId: string,
  recipientName: string,
): Promise<DocumentEmailPackage | null> {
  const data = await loadQuoteDocumentData(companyId, quoteId);
  if (!data) return null;

  const subject = `Cotización ${data.folio} — ${data.issuer.displayName}`;
  const plainText = `Estimado(a) ${recipientName},

Adjuntamos la cotización ${data.folio} por ${formatMxn(data.totalMxn)} MXN.

Puede consultar el documento en: ${data.documentUrl}

Saludos cordiales,
${data.issuer.displayName}`;

  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">
      Estimado(a) <strong>${escapeHtml(recipientName)}</strong>,
    </p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">
      Compartimos la cotización <strong>${escapeHtml(data.folio)}</strong> por un total de
      <strong>${escapeHtml(formatMxn(data.totalMxn))}</strong>.
    </p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
      En el archivo adjunto encontrará el detalle formal. También puede verla en línea.
    </p>`;

  const html = wrapEmailHtml({
    issuer: data.issuer,
    preheader: `Cotización ${data.folio} · ${formatMxn(data.totalMxn)}`,
    title: `Cotización ${data.folio}`,
    bodyHtml,
    cta: { label: "Ver cotización en línea", href: data.documentUrl },
    footerNote: "Si no esperaba este correo, ignore el mensaje o contacte a su ejecutivo comercial.",
  });

  const pdf = await renderQuotePdfBuffer(data);
  const safeFolio = data.folio.replace(/[^\w-]+/g, "_");

  return {
    subject,
    plainText,
    html,
    attachments: [
      {
        filename: `Cotizacion-${safeFolio}.pdf`,
        contentBase64: pdf.toString("base64"),
        mimeType: "application/pdf",
      },
    ],
  };
}

export async function buildQuotePrintHtml(companyId: string, quoteId: string) {
  const data = await loadQuoteDocumentData(companyId, quoteId);
  if (!data) return null;
  return renderQuoteDocumentHtml(data, { forPrint: true });
}
