import { redirect } from "next/navigation";
import { getCompanySettings } from "@/lib/company-settings";
import { getActiveTestSession } from "@/lib/test-mode";
import { getSession } from "@/lib/session";
import { toggleServomotoresInventoryAction } from "../inventario/actions";
import {
  endTestSessionAction,
  listUsersForTestSelect,
  startTestSessionAction,
  toggleTestModeAction,
  updateFiscalSettingsAction,
} from "./actions";

export default async function ConfiguracionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMINISTRADOR" && session.role !== "CEO") redirect("/app");
  const settings = await getCompanySettings(session.activeCompany.id);
  const testSession = session.role === "ADMINISTRADOR" ? await getActiveTestSession() : null;
  const allUsers = session.role === "ADMINISTRADOR" ? await listUsersForTestSelect() : [];

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Configuración — {session.activeCompany.displayName}</h1>

      <form action={updateFiscalSettingsAction} className="space-y-2 rounded-xl border bg-card p-4 text-sm">
        <h2 className="font-medium">Fiscal y compras</h2>
        <input
          name="fiscalLegalName"
          placeholder="Razón social"
          defaultValue={settings.fiscalLegalName ?? ""}
          className="w-full rounded border px-2 py-1"
        />
        <input
          name="fiscalRfc"
          placeholder="RFC"
          defaultValue={settings.fiscalRfc ?? ""}
          className="w-full rounded border px-2 py-1"
        />
        <label className="block">
          Presupuesto mensual compras (MXN)
          <input
            name="monthlyPurchaseBudgetMxn"
            type="number"
            defaultValue={settings.monthlyPurchaseBudgetMxn}
            className="w-full rounded border px-2 py-1"
          />
        </label>
        <label className="block">
          Máx. compra directa (MXN)
          <input
            name="maxDirectPurchaseMxn"
            type="number"
            defaultValue={settings.maxDirectPurchaseMxn}
            className="w-full rounded border px-2 py-1"
          />
        </label>
        <button type="submit" className="rounded bg-accent px-3 py-1 text-white">Guardar</button>
      </form>

      {session.role === "ADMINISTRADOR" && (
        <>
          <form action={toggleTestModeAction} className="rounded-xl border bg-card p-4">
            <p className="mb-2 text-xs text-slate-600">Bandera local por empresa (preferencia UI).</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="enabled" defaultChecked={settings.testModeEnabled} />
              Modo de pruebas (bandera)
            </label>
            <button type="submit" className="mt-2 rounded border px-3 py-1 text-sm">Guardar</button>
          </form>
          <section className="rounded-xl border border-dashed bg-card p-4 text-sm">
            <h2 className="font-medium">Modo de pruebas (sesión)</h2>
            {testSession ? (
              <>
                <p className="text-slate-600">Sesión activa desde {testSession.startedAt.toISOString()}</p>
                <form action={endTestSessionAction}>
                  <button type="submit" className="mt-2 rounded bg-red-700 px-3 py-1 text-white">Finalizar pruebas</button>
                </form>
              </>
            ) : (
              <form action={startTestSessionAction} className="mt-2 space-y-2">
                <p className="text-xs text-slate-600">Usuarios seleccionados operan en contexto aislado; no afecta folios ni finanzas reales.</p>
                <select name="userIds" multiple className="h-32 w-full rounded border text-xs">
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.displayName} ({u.username})</option>
                  ))}
                </select>
                <button type="submit" className="rounded bg-accent px-3 py-1 text-white">Iniciar sesión de pruebas</button>
              </form>
            )}
          </section>
        </>
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
