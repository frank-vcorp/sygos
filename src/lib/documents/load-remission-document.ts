import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clients, remissions } from "@/db/schema";
import { getPublicAppUrl } from "@/lib/documents/app-url";
import type { CommercialDocumentData } from "@/lib/documents/commercial-document";
import { loadIssuerBrand } from "@/lib/documents/load-issuer";

export type RemissionDocumentPayload = {
  commercial: CommercialDocumentData;
  documentUrl: string;
};

export async function loadRemissionCommercialDocument(
  companyId: string,
  remissionId: string,
): Promise<RemissionDocumentPayload | null> {
  const db = getDb();
  const [row] = await db
    .select({ remission: remissions, client: clients })
    .from(remissions)
    .innerJoin(clients, eq(remissions.clientId, clients.id))
    .where(and(eq(remissions.id, remissionId), eq(remissions.companyId, companyId)))
    .limit(1);
  if (!row) return null;

  const issuer = await loadIssuerBrand(companyId);
  const baseUrl = getPublicAppUrl();

  const exitNote = row.remission.allowsPhysicalExit
    ? "Autoriza salida física de material."
    : "Sin autorización de salida física registrada.";

  const commercial: CommercialDocumentData = {
    kindTitle: "Remisión",
    folio: row.remission.folio,
    issuedAt: row.remission.createdAt,
    statusLabel: row.remission.invoiceObligationRemains ? "Pendiente de factura" : "Sin obligación fiscal",
    issuer,
    clientName: row.client.name,
    clientTaxId: row.client.taxIdentity,
    clientShippingAddress: row.client.shippingAddress,
    lines: [
      {
        description: `Entrega / remisión — ${row.remission.folio}`,
        detail: exitNote,
        amountMxn: row.remission.totalMxn,
      },
    ],
    totals: [{ label: "Valor referencia MXN", amountMxn: row.remission.totalMxn, emphasis: true }],
    legalNote:
      "Documento de control de entrega. No sustituye el CFDI. Montos en pesos mexicanos salvo indicación contraria.",
    footerTag: "Documento generado por Sygos",
  };

  return { commercial, documentUrl: `${baseUrl}/api/documents/remision/${remissionId}` };
}
