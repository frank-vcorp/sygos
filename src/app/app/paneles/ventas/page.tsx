import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { listQuotes } from "../../cotizaciones/actions";

export default async function PanelVentasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "VENTAS_SYSTRON" && session.role !== "CEO" && session.role !== "ADMINISTRADOR") {
    redirect("/app");
  }
  const quotes = await listQuotes(session.activeCompany.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Panel de ventas — {session.activeCompany.displayName}</h1>
      <p className="text-sm text-slate-600">Seguimiento comercial sin costos internos ni base Servomotores.</p>
      <ul className="divide-y rounded-xl border bg-card text-sm">
        {quotes.map((q) => (
          <li key={q.id} className="px-4 py-3">
            <Link href={`/app/cotizaciones/${q.id}`} className="text-accent">{q.folio}</Link>
            <span className="ml-2">{q.status}</span>
            {q.finalPriceMxn != null && session.role === "VENTAS_SYSTRON" && (
              <span className="ml-2">Cliente: ${q.finalPriceMxn} MXN</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
