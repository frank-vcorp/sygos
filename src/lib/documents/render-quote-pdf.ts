import PDFDocument from "pdfkit";
import type { QuoteDocumentData } from "@/lib/documents/types";
import { formatDateEs, formatMxn } from "@/lib/documents/format";

export async function renderQuotePdfBuffer(data: QuoteDocumentData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const navy = "#123a63";
    const teal = "#00b8c8";

    doc.fillColor(navy).fontSize(22).text("Cotización", { continued: false });
    doc.moveDown(0.3);
    doc.fillColor("#334155").fontSize(11).text(data.issuer.legalName);
    if (data.issuer.rfc) doc.text(`RFC ${data.issuer.rfc}`);
    doc.moveDown(1);

    doc.fillColor(teal).fontSize(10).text(`FOLIO ${data.folio}`, { align: "right" });
    doc.fillColor("#64748b").text(`Emisión: ${formatDateEs(data.issuedAt)}`, { align: "right" });

    doc.moveDown(1.2);
    doc.fillColor(teal).fontSize(9).text("CLIENTE", { characterSpacing: 1 });
    doc.fillColor(navy).fontSize(14).text(data.clientName);
    if (data.clientTaxId) doc.fillColor("#64748b").fontSize(10).text(`RFC ${data.clientTaxId}`);

    doc.moveDown(1);
    doc.rect(48, doc.y, 499, 22).fill(navy);
    doc.fillColor("#fff").fontSize(10).text("Concepto", 56, doc.y - 16, { width: 360 });
    doc.text("Importe", 420, doc.y - 16, { width: 120, align: "right" });

    doc.moveDown(0.6);
    const conceptY = doc.y;
    doc.fillColor("#172033").fontSize(11).text(data.concept, 56, conceptY, { width: 340 });
    doc.text(formatMxn(data.subtotalMxn), 420, conceptY, { width: 120, align: "right" });
    doc.fillColor("#64748b").fontSize(9).text(data.originLabel, 56, doc.y + 4);

    doc.moveDown(2);
    const totalY = doc.y;
    if (data.discountMxn > 0) {
      doc.fillColor("#64748b").fontSize(10).text("Subtotal", 320, totalY, { width: 100, align: "right" });
      doc.text(formatMxn(data.subtotalMxn), 420, totalY, { width: 120, align: "right" });
      doc.text(`Descuento (${data.discountPercent}%)`, 320, doc.y + 4, { width: 100, align: "right" });
      doc.text(`− ${formatMxn(data.discountMxn)}`, 420, doc.y, { width: 120, align: "right" });
    }
    doc.moveDown(0.8);
    doc.fillColor(navy).fontSize(12).text("Total MXN", 320, doc.y, { width: 100, align: "right" });
    doc.text(formatMxn(data.totalMxn), 420, doc.y - 14, { width: 120, align: "right" });

    doc.moveDown(2);
    doc.fillColor("#64748b").fontSize(9).text(
      `Vigencia: ${data.validityDays} días naturales. Precios en MXN. Documento generado por Sygos.`,
      { align: "left" },
    );

    doc.end();
  });
}
