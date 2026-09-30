import { sendWhatsAppText } from "@/lib/whatsapp-manager";

export async function sendWhatsAppDocument(
  companyId: string,
  input: { toPhone: string; message: string },
) {
  return sendWhatsAppText(companyId, input.toPhone, input.message);
}
