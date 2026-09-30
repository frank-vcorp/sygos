import type { IssuerBrand } from "@/lib/documents/types";

export type PlainOutboundInput = {
  issuer: IssuerBrand;
  documentLabel: string;
  recipientName: string;
  introLines: string[];
  detailLines?: string[];
  ctaUrl?: string;
  ctaLabel?: string;
  closing?: string;
};

const RULE = "────────────────────────";

/** Mensaje plano unificado (WhatsApp y parte text de correo). */
export function buildPlainOutboundMessage(input: PlainOutboundInput): string {
  const issuerLine = input.issuer.rfc
    ? `${input.issuer.displayName} · RFC ${input.issuer.rfc}`
    : input.issuer.displayName;

  const blocks: string[] = [
    issuerLine,
    RULE,
    input.documentLabel.toUpperCase(),
    RULE,
    `Estimado(a) ${input.recipientName},`,
    "",
    ...input.introLines,
  ];

  if (input.detailLines?.length) {
    blocks.push("", ...input.detailLines);
  }

  if (input.ctaUrl) {
    blocks.push("", input.ctaLabel ?? "Ver documento:", input.ctaUrl);
  }

  blocks.push(
    "",
    input.closing ?? "Saludos cordiales,",
    input.issuer.displayName,
    "",
    "— Enviado con Sygos",
  );

  return blocks.join("\n");
}
