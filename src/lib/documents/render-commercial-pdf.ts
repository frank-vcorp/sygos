import PDFDocument from "pdfkit";
import { readCompanyLogoFile } from "@/lib/company-brand-logo";
import { DOC_BRAND } from "@/lib/documents/brand";
import { formatDateEs, formatMxn } from "@/lib/documents/format";
import type { CommercialDocumentData } from "@/lib/documents/commercial-document";

export async function renderCommercialPdfBuffer(data: CommercialDocumentData): Promise<Buffer> {
  const logoFile = await readCompanyLogoFile(data.companyId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = 499;
    const left = 48;

    if (logoFile) {
      const top = doc.y;
      doc.image(logoFile.buffer, left, top, { fit: [200, 48] });
      doc.y = top + 56;
    }

    doc.fillColor(DOC_BRAND.navy).fontSize(22).text(data.kindTitle);
    doc.moveDown(0.3);
    doc.fillColor("#334155").fontSize(11).text(data.issuer.legalName);
    if (data.issuer.rfc) doc.text(`RFC ${data.issuer.rfc}`);

    doc.fillColor(DOC_BRAND.teal).fontSize(10).text(`FOLIO ${data.folio}`, { align: "right" });
    doc.fillColor(DOC_BRAND.textMuted).text(`Emisión: ${formatDateEs(data.issuedAt)}`, { align: "right" });
    if (data.statusLabel) {
      doc.fillColor(DOC_BRAND.teal).fontSize(9).text(data.statusLabel.toUpperCase(), { align: "right" });
    }

    doc.moveDown(1.2);
    doc.fillColor(DOC_BRAND.teal).fontSize(9).text("CLIENTE", { characterSpacing: 1 });
    doc.fillColor(DOC_BRAND.navy).fontSize(14).text(data.clientName);
    if (data.clientTaxId) doc.fillColor(DOC_BRAND.textMuted).fontSize(10).text(`RFC ${data.clientTaxId}`);

    doc.moveDown(1);
    const tableTop = doc.y;
    doc.rect(left, tableTop, pageWidth, 22).fill(DOC_BRAND.navy);
    doc.fillColor("#fff").fontSize(10).text("Concepto", left + 8, tableTop + 6, { width: 360 });
    doc.text("Importe", left + 372, tableTop + 6, { width: 120, align: "right" });

    let rowY = tableTop + 28;
    for (const line of data.lines) {
      doc.fillColor(DOC_BRAND.text).fontSize(11).text(line.description, left + 8, rowY, { width: 340 });
      const amountY = rowY;
      doc.text(formatMxn(line.amountMxn), left + 372, amountY, { width: 120, align: "right" });
      if (line.detail) {
        doc.fillColor(DOC_BRAND.textMuted).fontSize(9).text(line.detail, left + 8, doc.y + 2, { width: 340 });
      }
      rowY = doc.y + 14;
      doc.moveTo(left, rowY).lineTo(left + pageWidth, rowY).strokeColor(DOC_BRAND.border).stroke();
      rowY += 10;
      doc.y = rowY;
    }

    doc.moveDown(1);
    for (const row of data.totals) {
      const y = doc.y;
      doc.fillColor(DOC_BRAND.textMuted).fontSize(row.emphasis ? 12 : 10).text(row.label, left + 272, y, {
        width: 100,
        align: "right",
      });
      doc
        .fillColor(row.emphasis ? DOC_BRAND.navy : DOC_BRAND.text)
        .fontSize(row.emphasis ? 12 : 10)
        .text(`${row.prefix ?? ""}${formatMxn(row.amountMxn)}`, left + 372, y, { width: 120, align: "right" });
      doc.moveDown(0.4);
    }

    doc.moveDown(1);
    doc.fillColor(DOC_BRAND.textMuted).fontSize(9).text(data.legalNote, { align: "left" });
    doc.moveDown(0.6);
    doc.fontSize(8).fillColor(DOC_BRAND.textSoft).text(`${data.footerTag} · ${data.issuer.displayName}`);

    doc.end();
  });
}
