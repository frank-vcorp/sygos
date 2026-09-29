import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCompanySettings } from "@/lib/company-settings";
import { toggleServomotoresInventoryAction } from "../inventario/actions";
import { toggleTestModeAction } from "./actions";

export default async function ConfiguracionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMINISTRADOR" && session.role !== "CEO") redirect("/app");
  const settings = await getCompanySettings(session.activeCompany.id);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Configuración — {session.activeCompany.displayName}</h1>
      {session.role === "ADMINISTRADOR" && (
        <form action={toggleTestModeAction} className="rounded-xl border bg-card p-4">
          <p className="mb-2 text-xs text-slate-600">
            Modo de pruebas completo (usuarios seleccionados, aislamiento) — en construcción. Este interruptor solo
            marca preferencia; no sustituye el Modo de Pruebas del Discovery.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={settings.testModeEnabled} />
            Modo de pruebas (bandera)
          </label>
          <button type="submit" className="mt-2 rounded border px-3 py-1 text-sm">Guardar</button>
        </form>
      )}
      {session.activeCompany.code === "SERVOMOTORES" && (
        <form action={toggleServomotoresInventoryAction} className="rounded-xl border bg-card p-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={settings.servomotoresInventoryEnabled} />
            Habilitar inventario Servomotores
          </label>
          <button type="submit" className="mt-2 rounded border px-3 py-1 text-sm">Guardar</button>
        </form>
      )}
    </div>
  );
}
