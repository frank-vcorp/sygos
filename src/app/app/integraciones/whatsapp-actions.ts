"use server";

import { requireIntegrationAdmin, revalidateIntegrationsPage } from "./actions";

export async function startWhatsAppPairingAction() {
  const session = await requireIntegrationAdmin();
  const { requestWhatsAppPairing } = await import("@/lib/whatsapp-manager");
  await requestWhatsAppPairing(session.activeCompany.id);
  await revalidateIntegrationsPage();
}

export async function disconnectWhatsAppAction() {
  const session = await requireIntegrationAdmin();
  const { disconnectWhatsApp } = await import("@/lib/whatsapp-manager");
  await disconnectWhatsApp(session.activeCompany.id);
  await revalidateIntegrationsPage();
}
