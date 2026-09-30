import type { FacturapiIntegrationConfig } from "@/lib/integration-types";

const BASE = "https://www.facturapi.io/v2";

function authHeader(config: FacturapiIntegrationConfig) {
  return { Authorization: `Bearer ${config.apiKey.trim()}` };
}

export async function testFacturapiConnection(config: FacturapiIntegrationConfig) {
  const res = await fetch(`${BASE}/organizations?limit=1`, {
    headers: { ...authHeader(config), Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false as const, error: body || res.statusText };
  }
  return { ok: true as const };
}

type StampInput = {
  folio: string;
  totalMxn: number;
  customerLegalName: string;
  customerTaxId: string;
};

export async function stampInvoiceOnFacturapi(config: FacturapiIntegrationConfig, input: StampInput) {
  const items = [
    {
      quantity: 1,
      product: {
        description: `Factura ${input.folio}`,
        product_key: "01010101",
        price: input.totalMxn,
        tax_included: false,
        taxes: [{ type: "IVA", rate: 0.16 }],
      },
    },
  ];

  const payload = {
    customer: {
      legal_name: input.customerLegalName,
      tax_id: input.customerTaxId,
      tax_system: "601",
    },
    items,
    payment_form: "03",
    use: "G03",
  };

  const url = config.organizationId
    ? `${BASE}/organizations/${config.organizationId}/invoices`
    : `${BASE}/invoices`;

  const res = await fetch(url, {
    method: "POST",
    headers: { ...authHeader(config), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; error?: string };
  if (!res.ok) {
    return {
      ok: false as const,
      error: data.message || data.error || res.statusText || "Error Facturapi",
    };
  }
  if (!data.id) {
    return { ok: false as const, error: "Facturapi no devolvió UUID" };
  }
  return { ok: true as const, uuid: data.id };
}
