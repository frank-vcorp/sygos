import Link from "next/link";
import { redirect } from "next/navigation";
import { coordinationPanelSnapshot } from "@/lib/panel-queries";
import { getSession } from "@/lib/session";

export default async function PanelCoordinacionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["COORDINACION_ADMIN", "ADMINISTRADOR", "CEO"].includes(session.role)) redirect("/app");
  const snap = await coordinationPanelSnapshot(session.activeCompany.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Panel coordinación — {session.activeCompany.displayName}</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
        <Link href="/app/finanzas" className="rounded border bg-card p-4 hover:border-accent">
          Facturas <span className="font-mono">{snap.invoices}</span>
        </Link>
        <Link href="/app/finanzas" className="rounded border bg-card p-4 hover:border-accent">
          Remisiones <span className="font-mono">{snap.remissions}</span>
        </Link>
        <Link href="/app/finanzas" className="rounded border bg-card p-4 hover:border-accent">
          Pagos por validar <span className="font-mono">{snap.paymentsPending.length}</span>
        </Link>
        <Link href="/app/compras" className="rounded border bg-card p-4 hover:border-accent">
          Compras abiertas <span className="font-mono">{snap.purchasesOpen.length}</span>
        </Link>
        <Link href="/app/compras" className="rounded border bg-card p-4 hover:border-accent">
          O.C. autorizadas <span className="font-mono">{snap.purchaseOrdersAuthorized.length}</span>
        </Link>
        <Link href="/app/rrhh" className="rounded border bg-card p-4 hover:border-accent">Nómina</Link>
      </div>
      <section className="text-sm">
        <h2 className="font-medium">Solicitudes documento</h2>
        <ul>
          {snap.documentRequests.map((d) => (
            <li key={d.id}>{d.requestType}</li>
          ))}
        </ul>
      </section>
      <section className="text-sm">
        <h2 className="font-medium">CxC / CxP</h2>
        <p>CxC abiertas: {snap.receivables.length} · CxP: {snap.payables.length}</p>
      </section>
    </div>
  );
}
