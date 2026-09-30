export type IntegrationKey = "FACTURAPI" | "SENDGRID" | "WHATSAPP";

export type FacturapiIntegrationConfig = {
  apiKey: string;
  organizationId?: string;
};

export type SendGridIntegrationConfig = {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
};

export type WhatsAppIntegrationConfig = {
  /** Etiqueta opcional; la sesión Baileys se guarda aparte. */
  displayName?: string;
};

export type IntegrationConfigMap = {
  FACTURAPI: FacturapiIntegrationConfig;
  SENDGRID: SendGridIntegrationConfig;
  WHATSAPP: WhatsAppIntegrationConfig;
};
