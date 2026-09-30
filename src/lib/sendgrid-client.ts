import type { SendGridIntegrationConfig } from "@/lib/integration-types";

type SendEmailAttachment = {
  filename: string;
  contentBase64: string;
  mimeType: string;
};

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: SendEmailAttachment[];
};

export async function sendEmailViaSendGrid(config: SendGridIntegrationConfig, input: SendEmailInput) {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: input.to }] }],
      from: {
        email: config.fromEmail.trim(),
        name: config.fromName?.trim() || undefined,
      },
      subject: input.subject,
      content: [
        { type: "text/plain", value: input.text },
        ...(input.html ? [{ type: "text/html", value: input.html }] : []),
      ],
      ...(input.attachments?.length
        ? {
            attachments: input.attachments.map((a) => ({
              content: a.contentBase64,
              filename: a.filename,
              type: a.mimeType,
              disposition: "attachment",
            })),
          }
        : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false as const, error: body || res.statusText };
  }
  return { ok: true as const };
}

export async function testSendGridConnection(config: SendGridIntegrationConfig) {
  if (!config.apiKey?.trim() || !config.fromEmail?.trim()) {
    return { ok: false as const, error: "API key y correo remitente requeridos" };
  }
  return { ok: true as const };
}
