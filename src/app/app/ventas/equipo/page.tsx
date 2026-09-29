import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listClientsForSelect } from "../../activos/actions";
import { createSpecialCommercialQuoteAction } from "../../cotizaciones/actions";

export default async function VentaEquipoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.activeCompany.code !== "SYSTRON" || session.role !== "VENTAS_SYSTRON") {
    if (!["CEO", "ADMINISTRADOR"].includes(session.role)) redirect("/app");
  }
  const clients = await listClientsForSelect(session.activeCompany.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Venta de equipo — SYSTRON</h1>
      <p className="text-sm text-slate-600">Cotización comercial sin ingreso físico hasta autorización e ingreso de equipo.</p>
      <form action={createSpecialCommercialQuoteAction} className="flex flex-wrap gap-2 rounded border p-4 text-sm">
        <input type="hidden" name="origin" value="VENTA_EQUIPO" />
        <select name="clientId" required className="rounded border px-2 py-1">
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="submit" className="rounded bg-accent px-3 py-1 text-white">Nueva cotización</button>
      </form>
      <Link href="/app/cotizaciones" className="text-sm text-accent">Ver cotizaciones</Link>
    </div>
  );
}
