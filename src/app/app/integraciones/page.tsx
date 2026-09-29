import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canConfigureIntegrations } from "@/lib/permissions";
import { getMotSequenceState, listIntegrations } from "../maestros/actions";

const LABELS: Record<string, string> = {
  FACTURAPI: "Facturación (Facturapi)",
  SENDGRID: "Correo (SendGrid)",
  WHATSAPP: "WhatsApp",
};

export default async function IntegracionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canConfigureIntegrations(session.role)) redirect("/app");

  const [rows, mot] = await Promise.all([
    listIntegrations(session.activeCompany.id),
    getMotSequenceState(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app" className="text-sm text-accent hover:underline">
          ← Inicio
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Integraciones</h1>
        <p className="mt-1 text-sm text-slate-600">
          Empresa activa: <strong>{session.activeCompany.displayName}</strong>. Estado real por integración; en
          producción no se simula éxito si faltan credenciales.
        </p>
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm">
            <span className="font-medium">{LABELS[row.integration] ?? row.integration}</span>
            {row.configured ? (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
                Configurada (credenciales en servidor; no se muestran completas)
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                No configurada — timbrado/correo fallará y la operación quedará guardada sin envío
              </span>
            )}
          </li>
        ))}
      </ul>

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
