import { escapeHtml } from "@/lib/documents/escape";
import type { IssuerBrand } from "@/lib/documents/types";

const DEFAULT_LOCKUP = "/brand/sygos-lockup.png";

export function renderDocumentLogoHtml(issuer: IssuerBrand) {
  if (issuer.logoDataUrl) {
    return `<img src="${issuer.logoDataUrl}" alt="${escapeHtml(issuer.displayName)}" style="height:52px;max-width:260px;width:auto;object-fit:contain;margin-bottom:16px;display:block;" />`;
  }
  return `<img src="${DEFAULT_LOCKUP}" alt="Sygos" style="height:44px;width:auto;margin-bottom:16px;" />`;
}

export function renderEmailBrandHeaderHtml(issuer: IssuerBrand) {
  if (issuer.logoDataUrl) {
    return `<img src="${issuer.logoDataUrl}" alt="${escapeHtml(issuer.displayName)}" style="max-height:48px;max-width:220px;width:auto;object-fit:contain;margin-bottom:10px;display:block;" />`;
  }
  return `<div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#00b8c8;margin-bottom:8px;">Sygos</div>`;
}
