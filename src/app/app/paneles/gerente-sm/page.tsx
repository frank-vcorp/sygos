import Link from "next/link";
import { redirect } from "next/navigation";
import { gerenteSmPanelSnapshot } from "@/lib/panel-queries";
import { getSession } from "@/lib/session";

export default async function PanelGerenteSmPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (
    session.role !== "GERENTE_OPERATIVO_SERVOMOTORES" &&
    session.role !== "CEO" &&
    session.role !== "ADMINISTRADOR"
  ) {
    redirect("/app");
  }
  if (session.activeCompany.code !== "SERVOMOTORES" && session.role === "GERENTE_OPERATIVO_SERVOMOTORES") {
    redirect("/app");
  }
  const snap = await gerenteSmPanelSnapshot(session.activeCompany.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Panel Gerente Operativo — Servomotores</h1>
      <section className="text-sm">
        <h2 className="font-medium">Cotizaciones pendientes de precio</h2>
        <ul>
          {snap.pendingQuotes.map((q) => (
            <li key={q.id}>
              <Link href={`/app/cotizaciones/${q.id}`} className="text-accent">{q.folio}</Link>
            </li>
          ))}
        </ul>
      </section>
      {snap.pendingReceipts.length > 0 && (
        <section className="text-sm">
          <h2 className="font-medium">Pendientes de comprobación</h2>
          <Link href="/app/finanzas/comprobaciones" className="text-accent">{snap.pendingReceipts.length} abiertos</Link>
        </section>
      )}
      <section className="text-sm">
        <h2 className="font-medium">Compras recientes</h2>
        <ul>
          {snap.purchases.map((p) => (
            <li key={p.id}>{p.description} — ${p.amountMxn}</li>
          ))}
        </ul>
        <Link href="/app/compras" className="text-accent">Ir a compras</Link>
      </section>
      <section className="text-sm">
        <h2 className="font-medium">Producción técnica (créditos)</h2>
        <p>{snap.production.length} registros atribuidos al cierre técnico.</p>
      </section>
    </div>
  );
}
