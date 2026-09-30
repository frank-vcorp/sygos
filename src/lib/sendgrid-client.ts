import type { SendGridIntegrationConfig } from "@/lib/integration-types";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
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
