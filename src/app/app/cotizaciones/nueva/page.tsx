import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listClientsForSelect } from "../../activos/actions";
import { createQuoteAction } from "../actions";

export default async function NuevaCotizacionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const clients = await listClientsForSelect(session.activeCompany.id);

  return (
    <form action={createQuoteAction} className="mx-auto max-w-md space-y-4 rounded-xl border bg-card p-6">
      <h1 className="text-xl font-semibold">Nueva cotización</h1>
      <p className="text-sm text-slate-600">El vendedor puede iniciar sin precio; CEO/Admin fija precio después.</p>
      <select name="clientId" required className="w-full rounded border px-3 py-2">
        <option value="">Cliente</option>
        {clients.filter((c) => !c.isIntercompany).map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <input name="commercialReference" placeholder="Referencia comercial" className="w-full rounded border px-3 py-2" />
      <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm text-white">Crear</button>
    </form>
  );
}
