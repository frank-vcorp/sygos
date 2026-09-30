import { saveFacturapiConfigAction, testFacturapiConfigAction } from "@/app/app/integraciones/facturapi-actions";

export function FacturapiConfigForm({
  configured,
  maskedKey,
  organizationId,
}: {
  configured: boolean;
  maskedKey: string | null;
  organizationId: string | null;
}) {
  return (
    <div className="space-y-3">
      <form action={saveFacturapiConfigAction} className="space-y-3">
        <label className="block text-xs font-medium text-slate-700">
          API key (Secret key)
          <input
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={configured ? `Actual: ${maskedKey ?? "••••"}` : "sk_live_…"}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Organization ID (opcional)
          <input
            name="organizationId"
            defaultValue={organizationId ?? ""}
            placeholder="org_…"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
        >
          Guardar Facturapi
        </button>
      </form>
      {configured && (
        <form action={testFacturapiConfigAction}>
          <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">
            Probar conexión
          </button>
        </form>
      )}
    </div>
  );
}
