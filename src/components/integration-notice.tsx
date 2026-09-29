import Link from "next/link";
import { canConfigureIntegrations } from "@/lib/permissions";

type Row = { integration: string; configured: boolean };

const LABELS: Record<string, string> = {
  FACTURAPI: "Facturapi",
  SENDGRID: "SendGrid",
  WHATSAPP: "WhatsApp",
};

export function IntegrationNotice({
  role,
  rows,
}: {
  role: string;
  rows: Row[];
}) {
  const missing = rows.filter((r) => !r.configured);
  if (missing.length === 0) return null;

  const names = missing.map((r) => LABELS[r.integration] ?? r.integration).join(", ");

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950">
      Integraciones sin configurar en esta empresa: <strong>{names}</strong>.
      {canConfigureIntegrations(role as never) ? (
        <>
          {" "}
          <Link href="/app/integraciones" className="font-medium text-accent underline-offset-2 hover:underline">
            Revisar integraciones
          </Link>
        </>
      ) : (
        " Contacta a Administrador para credenciales."
      )}
    </div>
  );
}
