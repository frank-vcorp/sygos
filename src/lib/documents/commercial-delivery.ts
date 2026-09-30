import {
  renderCommercialDocumentBody,
  wrapCommercialPrintHtml,
  type CommercialDocumentData,
} from "@/lib/documents/commercial-document";
import { escapeHtml } from "@/lib/documents/escape";
import { formatMxn } from "@/lib/documents/format";
import { wrapEmailHtml } from "@/lib/documents/email-shell";
import { buildPlainOutboundMessage } from "@/lib/documents/plain-outbound";
import { renderCommercialPdfBuffer } from "@/lib/documents/render-commercial-pdf";
import type { DocumentEmailPackage } from "@/lib/documents/types";

export type CommercialDeliveryOptions = {
  data: CommercialDocumentData;
  documentUrl: string;
  recipientName: string;
  emailSubject: string;
  documentLabel: string;
  pdfFilenamePrefix: string;
  introSentence: string;
  footerNote?: string;
};

export async function buildCommercialDeliveryPackage(
  options: CommercialDeliveryOptions,
): Promise<DocumentEmailPackage> {
  const { data, documentUrl, recipientName, emailSubject, documentLabel, pdfFilenamePrefix, introSentence } =
    options;

  const plainText = buildPlainOutboundMessage({
    issuer: data.issuer,
    documentLabel,
    recipientName,
    introLines: [introSentence, `Folio: ${data.folio}`, `Total: ${formatMxn(data.totals.at(-1)?.amountMxn ?? 0)}`],
    ctaUrl: documentUrl,
    ctaLabel: "Consultar documento en línea:",
  });

  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">
      Estimado(a) <strong>${escapeHtml(recipientName)}</strong>,
    </p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">
      ${escapeHtml(introSentence)}
    </p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
      Folio <strong>${escapeHtml(data.folio)}</strong> · Total <strong>${escapeHtml(formatMxn(data.totals.at(-1)?.amountMxn ?? 0))}</strong>.
      En el adjunto encontrará el formato formal.
    </p>`;

  const html = wrapEmailHtml({
    issuer: data.issuer,
    preheader: `${data.kindTitle} ${data.folio}`,
    title: `${data.kindTitle} ${data.folio}`,
    bodyHtml,
    cta: { label: `Ver ${data.kindTitle.toLowerCase()} en línea`, href: documentUrl },
    footerNote: options.footerNote,
  });

  const pdf = await renderCommercialPdfBuffer(data);
  const safeFolio = data.folio.replace(/[^\w-]+/g, "_");

  return {
    subject: emailSubject,
    plainText,
    whatsappBody: plainText,
    html,
    attachments: [
      {
        filename: `${pdfFilenamePrefix}-${safeFolio}.pdf`,
        contentBase64: pdf.toString("base64"),
        mimeType: "application/pdf",
      },
    ],
  };
}

export function buildCommercialPrintHtml(data: CommercialDocumentData) {
  const body = renderCommercialDocumentBody(data);
  return wrapCommercialPrintHtml(`${data.kindTitle} ${data.folio}`, body);
}
