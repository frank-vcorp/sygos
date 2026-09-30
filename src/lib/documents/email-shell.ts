import { DOC_BRAND } from "@/lib/documents/brand";
import { escapeHtml } from "@/lib/documents/escape";
import { renderEmailBrandHeaderHtml } from "@/lib/documents/document-logo";
import { buildPlainOutboundMessage } from "@/lib/documents/plain-outbound";
import type { IssuerBrand } from "@/lib/documents/types";

const BRAND_NAVY = DOC_BRAND.navy;
const BRAND_TEAL = DOC_BRAND.teal;

export function wrapEmailHtml(input: {
  issuer: IssuerBrand;
  preheader: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  footerNote?: string;
}) {
  const preheader = escapeHtml(input.preheader);
  const title = escapeHtml(input.title);
  const issuer = escapeHtml(input.issuer.displayName);
  const legal = escapeHtml(input.issuer.legalName);
  const rfc = input.issuer.rfc ? escapeHtml(input.issuer.rfc) : "";

  const ctaBlock = input.cta
    ? `<p style="margin:28px 0 0;text-align:center;">
        <a href="${escapeHtml(input.cta.href)}" style="display:inline-block;background:${BRAND_NAVY};color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;">${escapeHtml(input.cta.label)}</a>
      </p>`
    : "";

  const footer = input.footerNote
    ? `<p style="margin:16px 0 0;font-size:12px;color:#64748b;line-height:1.5;">${escapeHtml(input.footerNote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Segoe UI,system-ui,-apple-system,sans-serif;color:#172033;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dce3eb;box-shadow:0 12px 40px rgba(15,23,42,.08);">
          <tr>
            <td style="padding:24px 28px;background:linear-gradient(135deg,${BRAND_NAVY} 0%,#0d2741 100%);">
              ${renderEmailBrandHeaderHtml(input.issuer)}
              <div style="font-size:20px;font-weight:700;color:#fff;line-height:1.2;">${issuer}</div>
              <div style="font-size:12px;color:#cbd5e1;margin-top:6px;">${legal}${rfc ? ` · RFC ${rfc}` : ""}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:${BRAND_NAVY};">${title}</h1>
              ${input.bodyHtml}
              ${ctaBlock}
              ${footer}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;line-height:1.5;">
              Mensaje enviado desde Sygos en nombre de ${issuer}. No compartas enlaces con terceros si contienen datos comerciales confidenciales.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function communicationEmailPackage(input: {
  issuer: IssuerBrand;
  subject: string;
  recipientName: string;
  body: string;
}) {
  const paragraphs = input.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");

  const html = wrapEmailHtml({
    issuer: input.issuer,
    preheader: input.subject,
    title: input.subject,
    bodyHtml: `<p style="margin:0 0 14px;font-size:15px;color:#334155;">Estimado(a) <strong>${escapeHtml(input.recipientName)}</strong>,</p>${paragraphs}`,
  });

  const plainText = buildPlainOutboundMessage({
    issuer: input.issuer,
    documentLabel: input.subject,
    recipientName: input.recipientName,
    introLines: input.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
  });

  return { subject: input.subject, plainText, html, whatsappBody: plainText };
}
