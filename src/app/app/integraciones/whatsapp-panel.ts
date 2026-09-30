import QRCode from "qrcode";
import { getWhatsAppSnapshot } from "@/lib/whatsapp-snapshot";

/** Solo lectura para la página Integraciones (sin cargar Baileys). */
export async function getWhatsAppPanelState(companyId: string) {
  const snap = await getWhatsAppSnapshot(companyId);
  const qrDataUrl =
    snap.qr && snap.status === "QR_PENDING"
      ? await QRCode.toDataURL(snap.qr, { margin: 1, width: 240 })
      : null;
  return { ...snap, qrDataUrl };
}
