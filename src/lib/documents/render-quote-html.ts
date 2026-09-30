import { escapeHtml } from "@/lib/documents/escape";
import { formatDateEs, formatMxn } from "@/lib/documents/format";
import type { QuoteDocumentData } from "@/lib/documents/types";

const NAVY = "#123a63";
const TEAL = "#00b8c8";

function row(label: string, value: string, bold = false) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #e8edf2;color:#64748b;font-size:13px;width:38%;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid #e8edf2;color:#172033;font-size:14px;text-align:right;${bold ? "font-weight:700;font-size:16px;" : ""}">${value}</td>
  </tr>`;
}

export function renderQuoteDocumentHtml(data: QuoteDocumentData, options?: { forPrint?: boolean }) {
  const forPrint = options?.forPrint ?? false;

  const validity = new Date(data.issuedAt);
  validity.setDate(validity.getDate() + data.validityDays);

  const body = `
<article style="max-width:820px;margin:0 auto;background:#fff;color:#172033;font-family:Segoe UI,system-ui,sans-serif;">
  <header style="display:flex;justify-content:space-between;gap:24px;padding:32px 36px 24px;border-bottom:3px solid ${TEAL};">
    <div>
      <img src="/brand/sygos-lockup.png" alt="Sygos" style="height:44px;width:auto;margin-bottom:16px;" />
      <h1 style="margin:0;font-size:26px;font-weight:700;color:${NAVY};letter-spacing:-.02em;">Cotización</h1>
      <p style="margin:8px 0 0;font-size:14px;color:#64748b;">${escapeHtml(data.issuer.legalName)}</p>
      ${data.issuer.rfc ? `<p style="margin:4px 0 0;font-size:13px;color:#64748b;">RFC ${escapeHtml(data.issuer.rfc)}</p>` : ""}
    </div>
    <div style="text-align:right;min-width:200px;">
      <div style="display:inline-block;padding:10px 16px;border-radius:12px;background:#f0f6fb;border:1px solid #dce3eb;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#64748b;">Folio</div>
        <div style="font-size:20px;font-weight:700;color:${NAVY};font-family:ui-monospace,monospace;">${escapeHtml(data.folio)}</div>
      </div>
      <p style="margin:12px 0 0;font-size:13px;color:#64748b;">Emisión: ${escapeHtml(formatDateEs(data.issuedAt))}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Vigencia: ${escapeHtml(formatDateEs(validity))}</p>
    </div>
  </header>

  <section style="padding:28px 36px 8px;">
    <h2 style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${TEAL};">Cliente</h2>
    <p style="margin:0;font-size:17px;font-weight:600;color:${NAVY};">${escapeHtml(data.clientName)}</p>
    ${data.clientTaxId ? `<p style="margin:6px 0 0;font-size:13px;color:#64748b;">RFC ${escapeHtml(data.clientTaxId)}</p>` : ""}
    ${data.clientShippingAddress ? `<p style="margin:6px 0 0;font-size:13px;color:#64748b;">${escapeHtml(data.clientShippingAddress)}</p>` : ""}
  </section>

  <section style="padding:16px 36px 8px;">
    <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <thead>
        <tr style="background:${NAVY};color:#fff;">
          <th style="padding:12px 14px;text-align:left;font-size:12px;font-weight:600;letter-spacing:.06em;">Concepto</th>
          <th style="padding:12px 14px;text-align:right;font-size:12px;font-weight:600;width:120px;">Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background:#fafbfc;">
          <td style="padding:14px;vertical-align:top;border-bottom:1px solid #e8edf2;">
            <div style="font-weight:600;color:#172033;">${escapeHtml(data.concept)}</div>
            <div style="margin-top:6px;font-size:12px;color:#64748b;">${escapeHtml(data.originLabel)}</div>
            ${data.commercialReference ? `<div style="margin-top:4px;font-size:12px;color:#64748b;">Ref. ${escapeHtml(data.commercialReference)}</div>` : ""}
          </td>
          <td style="padding:14px;text-align:right;vertical-align:top;border-bottom:1px solid #e8edf2;font-weight:600;">${escapeHtml(formatMxn(data.subtotalMxn))}</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section style="padding:8px 36px 32px;">
    <table style="width:100%;max-width:360px;margin-left:auto;border-collapse:collapse;">
      ${data.discountMxn > 0 ? row("Subtotal", escapeHtml(formatMxn(data.subtotalMxn))) : ""}
      ${data.discountMxn > 0 ? row(`Descuento (${data.discountPercent}%)`, `− ${escapeHtml(formatMxn(data.discountMxn))}`) : ""}
      ${row("Total MXN", escapeHtml(formatMxn(data.totalMxn)), true)}
    </table>
    <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#64748b;">
      Precios en pesos mexicanos. La vigencia de esta propuesta es de ${data.validityDays} días naturales a partir de la fecha de emisión.
      Los tiempos de entrega y condiciones operativas se confirman al autorizar por escrito.
    </p>
  </section>

  <footer style="padding:20px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;">
    Documento generado por Sygos · ${escapeHtml(data.issuer.displayName)} · ${escapeHtml(formatDateEs(new Date()))}
  </footer>
</article>`;

  if (forPrint) {
    return `<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="utf-8" />
  <title>Cotización ${escapeHtml(data.folio)}</title>
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
    <button onclick="window.print()" style="background:${NAVY};color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:600;cursor:pointer;">Imprimir / Guardar PDF</button>
  </div>
  ${body}
</body>
</html>`;
  }

  return body;
}
