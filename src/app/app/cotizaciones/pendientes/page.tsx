import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listPendingQuote } from "../actions";

export default async function PendientesCotizarPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const rows = await listPendingQuote(session.activeCompany.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pendiente de cotizar</h1>
      <ul className="divide-y rounded-xl border bg-card">
        {rows.map((q) => (
          <li key={q.id} className="px-4 py-3 text-sm">
            <Link href={`/app/cotizaciones/${q.id}`} className="text-accent">{q.folio}</Link>
            <span className="ml-2 text-xs text-slate-500">{q.pendingOrigin?.replaceAll("_", " ") ?? "—"}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-8 text-center text-slate-500">Bandeja vacía.</li>}
      </ul>
    </div>
  );
}
