import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { getSession } from "@/lib/session";
import { canConfigureIntegrations } from "@/lib/permissions";
import { FacturapiConfigForm } from "@/components/integrations/facturapi-config-form";
import { SendGridConfigForm } from "@/components/integrations/sendgrid-config-form";
import { getFacturapiConfigView } from "./facturapi-actions";
import { WhatsAppConfigPanel } from "@/components/integrations/whatsapp-config-panel";
import { getSendGridConfigView } from "./sendgrid-actions";
import { getWhatsAppPanelState } from "./whatsapp-actions";
import { getMotSequenceState, listIntegrations } from "../maestros/actions";

const LABELS: Record<string, string> = {
  FACTURAPI: "Facturación (Facturapi)",
  SENDGRID: "Correo (SendGrid)",
  WHATSAPP: "WhatsApp (Baileys)",
};

const DESCRIPTIONS: Record<string, string> = {
  FACTURAPI: "Timbrado CFDI por empresa. Las credenciales se guardan cifradas en la base de datos.",
  SENDGRID: "Envío de documentos y notificaciones por correo a contactos de clientes.",
  WHATSAPP: "Envío de documentos por WhatsApp; vinculación de sesión con código QR (Baileys).",
};

export default async function IntegracionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canConfigureIntegrations(session.role)) redirect("/app");

  const [rows, mot, facturapiView, sendgridView, whatsappPanel] = await Promise.all([
    listIntegrations(session.activeCompany.id),
    getMotSequenceState(),
    getFacturapiConfigView(session.activeCompany.id),
    getSendGridConfigView(session.activeCompany.id),
    getWhatsAppPanelState(session.activeCompany.id),
  ]);

  const encryptionReady = Boolean(
    process.env.SYGOS_INTEGRATION_ENCRYPTION_KEY?.trim() || process.env.NODE_ENV !== "production",
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Sistema"
        title="Integraciones"
        description={`Empresa activa: ${session.activeCompany.displayName}. Configura credenciales y canales sin desplegar código.`}
        breadcrumbs={[{ label: "Inicio", href: "/app" }, { label: "Integraciones" }]}
      />

      {!encryptionReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Define <code className="rounded bg-white px-1">SYGOS_INTEGRATION_ENCRYPTION_KEY</code> en Coolify
          (secreto del servidor) antes de guardar credenciales en producción.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {rows.map((row) => (
          <Card key={row.id} className="flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold">{LABELS[row.integration] ?? row.integration}</h2>
              {row.configured ? (
                <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-800">
                  Configurada
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                  Pendiente
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              {DESCRIPTIONS[row.integration] ?? "Integración del sistema."}
            </p>
            {row.integration === "FACTURAPI" && (
              <FacturapiConfigForm
                configured={facturapiView.configured}
                maskedKey={facturapiView.maskedKey}
                organizationId={facturapiView.organizationId}
              />
            )}
            {row.integration === "SENDGRID" && (
              <SendGridConfigForm
                configured={sendgridView.configured}
                maskedKey={sendgridView.maskedKey}
                fromEmail={sendgridView.fromEmail}
                fromName={sendgridView.fromName}
              />
            )}
            {row.integration === "WHATSAPP" && (
              <WhatsAppConfigPanel
                status={whatsappPanel.status}
                linkedPhone={whatsappPanel.linkedPhone}
                lastError={whatsappPanel.lastError}
                qrDataUrl={whatsappPanel.qrDataUrl}
              />
            )}
          </Card>
        ))}
      </div>

      <Card className="p-6 text-sm">
        <h2 className="font-semibold">Envío de documentos</h2>
        <p className="mt-2 text-slate-600">
          Cotizaciones, comprobantes y archivos adjuntos podrán enviarse por <strong>correo</strong> y por{" "}
          <strong>WhatsApp</strong> usando estas integraciones. Si un canal no está configurado, el envío por ese
          canal fallará de forma explícita (sin simular éxito).
        </p>
      </Card>

      <section className="rounded-xl border border-dashed border-border bg-white/70 p-6 text-sm">
        <h2 className="font-semibold">Secuencia MOT (global)</h2>
        <p className="mt-2 text-slate-600">
          Compartida entre SYSTRON y Servomotores. Próximo folio al registrar un MOT:{" "}
          <span className="font-mono font-medium">{mot.nextPreview}</span>
          {mot.lastAssigned && (
            <>
              {" "}
              · Último asignado: <span className="font-mono">{mot.lastAssigned}</span>
            </>
          )}
        </p>
      </section>
    </div>
  );
}
