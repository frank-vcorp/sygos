import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clients, invoices } from "@/db/schema";
import { getCompanySettings } from "@/lib/company-settings";
import { getPublicAppUrl } from "@/lib/documents/app-url";
import type { CommercialDocumentData } from "@/lib/documents/commercial-document";
import { loadIssuerBrand } from "@/lib/documents/load-issuer";

const INVOICE_STATUS: Record<string, string> = {
  BORRADOR: "Borrador",
  TIMBRADA: "Timbrada",
  CANCELADA: "Cancelada",
  CANCELACION_PENDIENTE: "Cancelación pendiente",
};

export async function loadInvoiceCommercialDocument(
  companyId: string,
  invoiceId: string,
): Promise<InvoiceDocumentPayload | null> {
  const db = getDb();
  const [row] = await db
    .select({ invoice: invoices, client: clients })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(eq(invoices.id, invoiceId), eq(invoices.companyId, companyId)))
    .limit(1);
  if (!row) return null;

  const issuer = await loadIssuerBrand(companyId);
  const baseUrl = getPublicAppUrl();
  const stampNote = row.invoice.facturapiUuid
    ? `CFDI timbrado (UUID ${row.invoice.facturapiUuid}). El XML/PDF fiscal oficial se obtiene desde Facturapi.`
    : "Documento de referencia interna. El comprobante fiscal se emite al timbrar en Facturapi.";

  const commercial: CommercialDocumentData = {
    kindTitle: "Factura",
    folio: row.invoice.folio,
    issuedAt: row.invoice.createdAt,
    statusLabel: INVOICE_STATUS[row.invoice.status] ?? row.invoice.status,
    issuer,
    clientName: row.client.name,
    clientTaxId: row.client.taxIdentity,
    clientShippingAddress: row.client.shippingAddress,
    lines: [
      {
        description: `Servicios y conceptos — ${row.invoice.folio}`,
        detail: row.invoice.isIntercompany ? "Operación intercompañía" : null,
        amountMxn: row.invoice.totalMxn,
      },
    ],
    totals: [{ label: "Total MXN", amountMxn: row.invoice.totalMxn, emphasis: true }],
    legalNote: `${stampNote} Montos en pesos mexicanos.`,
    footerTag: "Resumen comercial Sygos",
  };

  return { commercial, documentUrl: `${baseUrl}/api/documents/factura/${invoiceId}` };
}

export type InvoiceDocumentPayload = {
  commercial: CommercialDocumentData;
  documentUrl: string;
};
