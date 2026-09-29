import Link from "next/link";
import { redirect } from "next/navigation";
import { ceoPanelSnapshot } from "@/lib/panel-queries";
import { getSession } from "@/lib/session";
import { authorizePurchaseOrderAction } from "../../compras/actions";

export default async function PanelCeoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CEO" && session.role !== "ADMINISTRADOR") redirect("/app");

  const snap = await ceoPanelSnapshot(session.activeCompany.id);

  return (
    <div className="space-y-4 rounded-xl border bg-card p-6">
      <h1 className="text-xl font-semibold">Panel CEO</h1>
      <p className="text-sm text-slate-600">Empresa activa: {session.activeCompany.displayName}. Sin vista consolidada.</p>
      <section className="text-sm">
        <h2 className="font-medium">Pendientes de cotizar</h2>
        <ul>
          {snap.pendingQuotes.map((q) => (
            <li key={q.id}>
              <Link href={`/app/cotizaciones/${q.id}`} className="text-accent">{q.folio}</Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="text-sm">
        <h2 className="font-medium">O.C. pendientes de autorización</h2>
        <ul>
          {snap.pendingOc.map((o) => (
            <li key={o.id} className="flex items-center gap-2 border-b py-1">
              {o.folio} — {o.description} — ${o.amountMxn}
              <form action={authorizePurchaseOrderAction}>
                <input type="hidden" name="purchaseOrderId" value={o.id} />
                <button type="submit" className="text-accent">Autorizar</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
      <Link href="/app/paneles/reportes" className="text-sm text-accent">Reportes por empresa</Link>
    </div>
  );
}
