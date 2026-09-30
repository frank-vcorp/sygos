"use server";

import QRCode from "qrcode";
import { requireIntegrationAdmin, revalidateIntegrationsPage } from "./actions";
import {
  disconnectWhatsApp,
  getWhatsAppSnapshot,
  requestWhatsAppPairing,
} from "@/lib/whatsapp-manager";

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

export async function getWhatsAppPanelState(companyId: string) {
  const snap = await getWhatsAppSnapshot(companyId);
  const qrDataUrl =
    snap.qr && snap.status === "QR_PENDING"
      ? await QRCode.toDataURL(snap.qr, { margin: 1, width: 240 })
      : null;
  return { ...snap, qrDataUrl };
}
