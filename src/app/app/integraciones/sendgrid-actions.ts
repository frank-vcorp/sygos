"use server";

import { requireIntegrationAdmin, revalidateIntegrationsPage } from "./actions";
import { getIntegrationConfig, maskSecret, setIntegrationConfig } from "@/lib/integration-store";
import { testSendGridConnection } from "@/lib/sendgrid-client";

export async function saveSendGridConfigAction(formData: FormData) {
  const session = await requireIntegrationAdmin();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const fromEmail = String(formData.get("fromEmail") ?? "").trim();
  const fromName = String(formData.get("fromName") ?? "").trim() || undefined;

  const existing = await getIntegrationConfig(session.activeCompany.id, "SENDGRID");
  if (!fromEmail) throw new Error("Indica el correo remitente");
  if (!apiKey && !existing?.apiKey) throw new Error("Indica la API key de SendGrid");

  await setIntegrationConfig(
    session.activeCompany.id,
    "SENDGRID",
    {
      apiKey: apiKey || existing!.apiKey,
      fromEmail,
      fromName: fromName ?? existing?.fromName,
    },
    session.id,
  );
  await revalidateIntegrationsPage();
}

export async function testSendGridConfigAction() {
  const session = await requireIntegrationAdmin();
  const config = await getIntegrationConfig(session.activeCompany.id, "SENDGRID");
  if (!config) throw new Error("Guarda la configuración antes de probar");
  const result = await testSendGridConnection(config);
  if (!result.ok) throw new Error(result.error ?? "Configuración incompleta");
}

export async function getSendGridConfigView(companyId: string) {
  const config = await getIntegrationConfig(companyId, "SENDGRID");
  return {
    configured: Boolean(config?.apiKey && config.fromEmail),
    maskedKey: maskSecret(config?.apiKey),
    fromEmail: config?.fromEmail ?? "",
    fromName: config?.fromName ?? "",
  };
}
