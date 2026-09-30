import { escapeHtml } from "@/lib/documents/escape";
import { DOC_BRAND, DOC_FONT } from "@/lib/documents/brand";
import { formatDateEs, formatMxn } from "@/lib/documents/format";
import { renderDocumentLogoHtml } from "@/lib/documents/document-logo";
import type { IssuerBrand } from "@/lib/documents/types";

export type CommercialDocumentLine = {
  description: string;
  detail?: string | null;
  amountMxn: number;
};

export type CommercialDocumentTotalsRow = {
  label: string;
  amountMxn: number;
  emphasis?: boolean;
  prefix?: string;
};

export type CommercialDocumentData = {
  companyId: string;
  kindTitle: string;
  folio: string;
  issuedAt: Date;
  statusLabel?: string | null;
  issuer: IssuerBrand;
  clientName: string;
  clientTaxId: string | null;
  clientShippingAddress: string | null;
  lines: CommercialDocumentLine[];
  totals: CommercialDocumentTotalsRow[];
  legalNote: string;
  footerTag: string;
};

function totalsRowHtml(row: CommercialDocumentTotalsRow) {
  const value = `${row.prefix ?? ""}${escapeHtml(formatMxn(row.amountMxn))}`;
  const bold = row.emphasis ? "font-weight:700;font-size:16px;" : "";
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${DOC_BRAND.border};color:${DOC_BRAND.textMuted};font-size:13px;width:38%;">${escapeHtml(row.label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${DOC_BRAND.border};color:${DOC_BRAND.text};font-size:14px;text-align:right;${bold}">${value}</td>
  </tr>`;
}

export function renderCommercialDocumentBody(data: CommercialDocumentData) {
  const lineRows = data.lines
    .map(
      (line) => `
        <tr style="background:#fafbfc;">
          <td style="padding:14px;vertical-align:top;border-bottom:1px solid ${DOC_BRAND.border};">
            <div style="font-weight:600;color:${DOC_BRAND.text};">${escapeHtml(line.description)}</div>
            ${line.detail ? `<div style="margin-top:6px;font-size:12px;color:${DOC_BRAND.textMuted};">${escapeHtml(line.detail)}</div>` : ""}
          </td>
          <td style="padding:14px;text-align:right;vertical-align:top;border-bottom:1px solid ${DOC_BRAND.border};font-weight:600;">${escapeHtml(formatMxn(line.amountMxn))}</td>
        </tr>`,
    )
    .join("");

  const statusBadge = data.statusLabel
    ? `<p style="margin:8px 0 0;font-size:12px;font-weight:600;color:${DOC_BRAND.teal};text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(data.statusLabel)}</p>`
    : "";

  return `
<article style="max-width:820px;margin:0 auto;background:${DOC_BRAND.white};color:${DOC_BRAND.text};font-family:${DOC_FONT};">
  <header style="display:flex;justify-content:space-between;gap:24px;padding:32px 36px 24px;border-bottom:3px solid ${DOC_BRAND.teal};">
    <div>
      ${renderDocumentLogoHtml(data.issuer)}
      <h1 style="margin:0;font-size:26px;font-weight:700;color:${DOC_BRAND.navy};letter-spacing:-.02em;">${escapeHtml(data.kindTitle)}</h1>
      <p style="margin:8px 0 0;font-size:14px;color:${DOC_BRAND.textMuted};">${escapeHtml(data.issuer.legalName)}</p>
      ${data.issuer.rfc ? `<p style="margin:4px 0 0;font-size:13px;color:${DOC_BRAND.textMuted};">RFC ${escapeHtml(data.issuer.rfc)}</p>` : ""}
    </div>
    <div style="text-align:right;min-width:200px;">
      <div style="display:inline-block;padding:10px 16px;border-radius:12px;background:#f0f6fb;border:1px solid #dce3eb;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${DOC_BRAND.textMuted};">Folio</div>
        <div style="font-size:20px;font-weight:700;color:${DOC_BRAND.navy};font-family:ui-monospace,monospace;">${escapeHtml(data.folio)}</div>
      </div>
      <p style="margin:12px 0 0;font-size:13px;color:${DOC_BRAND.textMuted};">Emisión: ${escapeHtml(formatDateEs(data.issuedAt))}</p>
      ${statusBadge}
    </div>
  </header>

  <section style="padding:28px 36px 8px;">
    <h2 style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${DOC_BRAND.teal};">Cliente</h2>
    <p style="margin:0;font-size:17px;font-weight:600;color:${DOC_BRAND.navy};">${escapeHtml(data.clientName)}</p>
    ${data.clientTaxId ? `<p style="margin:6px 0 0;font-size:13px;color:${DOC_BRAND.textMuted};">RFC ${escapeHtml(data.clientTaxId)}</p>` : ""}
    ${data.clientShippingAddress ? `<p style="margin:6px 0 0;font-size:13px;color:${DOC_BRAND.textMuted};">${escapeHtml(data.clientShippingAddress)}</p>` : ""}
  </section>

  <section style="padding:16px 36px 8px;">
    <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <thead>
        <tr style="background:${DOC_BRAND.navy};color:#fff;">
          <th style="padding:12px 14px;text-align:left;font-size:12px;font-weight:600;letter-spacing:.06em;">Concepto</th>
          <th style="padding:12px 14px;text-align:right;font-size:12px;font-weight:600;width:120px;">Importe</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>
  </section>

  <section style="padding:8px 36px 32px;">
    <table style="width:100%;max-width:360px;margin-left:auto;border-collapse:collapse;">
      ${data.totals.map(totalsRowHtml).join("")}
    </table>
    <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:${DOC_BRAND.textMuted};">${escapeHtml(data.legalNote)}</p>
  </section>

  <footer style="padding:20px 36px;background:${DOC_BRAND.surface};border-top:1px solid #e2e8f0;font-size:11px;color:${DOC_BRAND.textSoft};">
    ${escapeHtml(data.footerTag)} · ${escapeHtml(data.issuer.displayName)} · ${escapeHtml(formatDateEs(new Date()))}
  </footer>
</article>`;
}

export function wrapCommercialPrintHtml(pageTitle: string, body: string) {
  return `<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(pageTitle)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    @media print {
      body { margin: 0; background: #fff; }
      .no-print { display: none !important; }
    }
    body { margin: 0; background: #e8edf2; padding: 24px; }
  </style>
</head>
<body>
  <div class="no-print" style="max-width:820px;margin:0 auto 16px;text-align:right;">
    <button onclick="window.print()" style="background:${DOC_BRAND.navy};color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:600;cursor:pointer;">Imprimir / Guardar PDF</button>
  </div>
  ${body}
</body>
</html>`;
}
