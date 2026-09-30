"use server";

import { requireIntegrationAdmin, revalidateIntegrationsPage } from "./actions";
import { disconnectWhatsApp, requestWhatsAppPairing } from "@/lib/whatsapp-manager";

export async function startWhatsAppPairingAction() {
  const session = await requireIntegrationAdmin();
  await requestWhatsAppPairing(session.activeCompany.id);
  await revalidateIntegrationsPage();
}

export async function disconnectWhatsAppAction() {
  const session = await requireIntegrationAdmin();
  await disconnectWhatsApp(session.activeCompany.id);
  await revalidateIntegrationsPage();
}
