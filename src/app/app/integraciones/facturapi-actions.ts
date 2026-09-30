"use server";

import { requireIntegrationAdmin, revalidateIntegrationsPage } from "./actions";
import { getIntegrationConfig, maskSecret, setIntegrationConfig } from "@/lib/integration-store";
import { testFacturapiConnection } from "@/lib/facturapi-client";

export async function saveFacturapiConfigAction(formData: FormData) {
  const session = await requireIntegrationAdmin();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const organizationId = String(formData.get("organizationId") ?? "").trim() || undefined;

  const existing = await getIntegrationConfig(session.activeCompany.id, "FACTURAPI");
  if (!apiKey && !existing?.apiKey) {
    throw new Error("Indica la API key de Facturapi");
  }

  await setIntegrationConfig(
    session.activeCompany.id,
    "FACTURAPI",
    {
      apiKey: apiKey || existing!.apiKey,
      organizationId: organizationId ?? existing?.organizationId,
    },
    session.id,
  );
  await revalidateIntegrationsPage();
}

export async function testFacturapiConfigAction() {
  const session = await requireIntegrationAdmin();
  const config = await getIntegrationConfig(session.activeCompany.id, "FACTURAPI");
  if (!config?.apiKey) throw new Error("Guarda la API key antes de probar");
  const result = await testFacturapiConnection(config);
  if (!result.ok) throw new Error(result.error ?? "Conexión fallida");
}

export async function getFacturapiConfigView(companyId: string) {
  const config = await getIntegrationConfig(companyId, "FACTURAPI");
  return {
    configured: Boolean(config?.apiKey),
    maskedKey: maskSecret(config?.apiKey),
    organizationId: config?.organizationId ?? null,
  };
}
