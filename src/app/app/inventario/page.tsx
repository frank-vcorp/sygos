import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCompanySettings } from "@/lib/company-settings";
import { adjustStockAction, createPartAction, listInventoryParts } from "./actions";

export default async function InventarioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const settings = await getCompanySettings(session.activeCompany.id);
  if (session.activeCompany.code === "SERVOMOTORES" && !settings.servomotoresInventoryEnabled) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm">
        <h1 className="text-xl font-semibold">Inventario Servomotores</h1>
        <p className="mt-2 text-slate-600">Deshabilitado por defecto. Un Administrador puede habilitarlo en Configuración.</p>
      </div>
    );
  }

  const parts = await listInventoryParts(session.activeCompany.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Inventario — {session.activeCompany.displayName}</h1>
      <p className="text-sm text-slate-600">Mín/máx informativos; sin reservas ni compras automáticas.</p>
      <form action={createPartAction} className="grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <input name="partNumber" required placeholder="Número de parte" className="rounded border px-3 py-2 text-sm" />
        <input name="description" required placeholder="Descripción" className="rounded border px-3 py-2 text-sm sm:col-span-2" />
        <input name="minQuantity" type="number" placeholder="Mín (opcional)" className="rounded border px-3 py-2 text-sm" />
        <input name="maxQuantity" type="number" placeholder="Máx (opcional)" className="rounded border px-3 py-2 text-sm" />
        <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm text-white sm:col-span-2 sm:w-fit">Alta refacción</button>
      </form>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-slate-500">
            <th className="py-2">Parte</th>
            <th>Existencia</th>
            <th>Mín/Máx</th>
            <th>Ajuste</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((p) => (
            <tr key={p.id} className="border-b border-border">
              <td className="py-2">
                <span className="font-mono">{p.partNumber}</span>
                <p className="text-slate-600">{p.description}</p>
              </td>
              <td>{p.quantityOnHand}</td>
              <td>{p.minQuantity ?? "—"} / {p.maxQuantity ?? "—"}</td>
              <td>
                <form action={adjustStockAction} className="flex gap-1">
                  <input type="hidden" name="id" value={p.id} />
                  <input name="delta" type="number" placeholder="+/-" className="w-16 rounded border px-1" />
                  <button type="submit" className="text-xs text-accent">Aplicar</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
