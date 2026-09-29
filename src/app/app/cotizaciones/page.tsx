import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listQuotes } from "./actions";

export default async function CotizacionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const rows = await listQuotes(session.activeCompany.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Cotizaciones</h1>
        <Link href="/app/cotizaciones/pendientes" className="text-sm text-accent">Pendiente de cotizar</Link>
        <Link href="/app/cotizaciones/nueva" className="rounded-md bg-accent px-3 py-2 text-sm text-white">Nueva</Link>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {rows.map((q) => (
          <li key={q.id} className="px-4 py-3 text-sm">
            <Link href={`/app/cotizaciones/${q.id}`} className="font-mono text-accent">{q.folio}</Link>
            <span className="ml-2 text-slate-500">{q.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
