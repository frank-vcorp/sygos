import { saveSendGridConfigAction, testSendGridConfigAction } from "@/app/app/integraciones/sendgrid-actions";

export function SendGridConfigForm({
  configured,
  maskedKey,
  fromEmail,
  fromName,
}: {
  configured: boolean;
  maskedKey: string | null;
  fromEmail: string;
  fromName: string;
}) {
  return (
    <div className="space-y-3">
      <form action={saveSendGridConfigAction} className="space-y-3">
        <label className="block text-xs font-medium text-slate-700">
          API key SendGrid
          <input
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={configured ? `Actual: ${maskedKey ?? "••••"}` : "SG.…"}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Correo remitente (verificado en SendGrid)
          <input
            name="fromEmail"
            type="email"
            required
            defaultValue={fromEmail}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Nombre remitente
          <input
            name="fromName"
            defaultValue={fromName}
            placeholder="SYGOS / SYSTRON"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </label>
        <button type="submit" className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white">
          Guardar SendGrid
        </button>
      </form>
      {configured && (
        <form action={testSendGridConfigAction}>
          <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">
            Validar configuración
          </button>
        </form>
      )}
    </div>
  );
}
