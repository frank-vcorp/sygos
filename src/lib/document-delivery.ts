import { getIntegrationConfig, isIntegrationConfigured } from "@/lib/integration-store";
import { sendEmailViaSendGrid } from "@/lib/sendgrid-client";
import { logDocumentDelivery } from "@/lib/document-delivery-log";
import { sendWhatsAppDocument } from "@/lib/whatsapp-client";
import { getWhatsAppSnapshot } from "@/lib/whatsapp-snapshot";

export type DocumentDeliveryChannel = "EMAIL" | "WHATSAPP";

export type DeliverDocumentInput = {
  companyId: string;
  channel: DocumentDeliveryChannel;
  entityType: string;
  entityId: string;
  contactId?: string | null;
  recipientName: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  subject: string;
  body: string;
  /** Si se define, se envía tal cual por WhatsApp (formato corporativo unificado). */
  whatsappBody?: string;
  html?: string;
  attachments?: { filename: string; contentBase64: string; mimeType: string }[];
  createdByUserId: string;
};

export async function deliverDocument(input: DeliverDocumentInput) {
  const recipient =
    input.channel === "EMAIL"
      ? input.recipientEmail?.trim()
      : normalizePhone(input.recipientPhone);

  if (!recipient) {
    const error =
      input.channel === "EMAIL"
        ? "El contacto no tiene correo electrónico"
        : "El contacto no tiene teléfono para WhatsApp";
    await logDocumentDelivery({
      companyId: input.companyId,
      channel: input.channel,
      status: "FAILED",
      entityType: input.entityType,
      entityId: input.entityId,
      contactId: input.contactId,
      recipient: recipient ?? "—",
      subject: input.subject,
      errorMessage: error,
      createdByUserId: input.createdByUserId,
    });
    return { ok: false as const, error };
  }

  const configured =
    input.channel === "EMAIL"
      ? await isIntegrationConfigured(input.companyId, "SENDGRID")
      : (await getWhatsAppSnapshot(input.companyId)).status === "CONNECTED";
  if (!configured) {
    const error =
      input.channel === "EMAIL"
        ? "SendGrid no configurado"
        : "WhatsApp no vinculado";
    await logDocumentDelivery({
      companyId: input.companyId,
      channel: input.channel,
      status: "FAILED",
      entityType: input.entityType,
      entityId: input.entityId,
      contactId: input.contactId,
      recipient,
      subject: input.subject,
      errorMessage: error,
      createdByUserId: input.createdByUserId,
    });
    return { ok: false as const, error };
  }

  if (input.channel === "EMAIL") {
    const config = await getIntegrationConfig(input.companyId, "SENDGRID");
    if (!config) return { ok: false as const, error: "SendGrid no configurado" };
    const sent = await sendEmailViaSendGrid(config, {
      to: recipient,
      subject: input.subject,
      text: input.body,
      html: input.html,
      attachments: input.attachments,
    });
    if (!sent.ok) {
      await logDocumentDelivery({
        companyId: input.companyId,
        channel: "EMAIL",
        status: "FAILED",
        entityType: input.entityType,
        entityId: input.entityId,
        contactId: input.contactId,
        recipient,
        subject: input.subject,
        errorMessage: sent.error,
        createdByUserId: input.createdByUserId,
      });
      return { ok: false as const, error: sent.error };
    }
    await logDocumentDelivery({
      companyId: input.companyId,
      channel: "EMAIL",
      status: "SENT",
      entityType: input.entityType,
      entityId: input.entityId,
      contactId: input.contactId,
      recipient,
      subject: input.subject,
      createdByUserId: input.createdByUserId,
    });
    return { ok: true as const };
  }

  const wa = await sendWhatsAppDocument(input.companyId, {
    toPhone: recipient,
    message: input.whatsappBody?.trim() || `${input.subject}\n\n${input.body}`,
  });
  if (!wa.ok) {
    await logDocumentDelivery({
      companyId: input.companyId,
      channel: "WHATSAPP",
      status: "FAILED",
      entityType: input.entityType,
      entityId: input.entityId,
      contactId: input.contactId,
      recipient,
      subject: input.subject,
      errorMessage: wa.error,
      createdByUserId: input.createdByUserId,
    });
    return { ok: false as const, error: wa.error };
  }
  await logDocumentDelivery({
    companyId: input.companyId,
    channel: "WHATSAPP",
    status: "SENT",
    entityType: input.entityType,
    entityId: input.entityId,
    contactId: input.contactId,
    recipient,
    subject: input.subject,
    createdByUserId: input.createdByUserId,
  });
  return { ok: true as const };
}

function normalizePhone(phone?: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10) return `52${digits}`;
  return digits;
}
