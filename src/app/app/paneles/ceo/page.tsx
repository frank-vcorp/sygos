import Link from "next/link";
import { redirect } from "next/navigation";
import { ceoPanelSnapshot } from "@/lib/panel-queries";
import { getSession } from "@/lib/session";
import { authorizePurchaseOrderAction } from "../../compras/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { MetricCard } from "@/components/patterns/metric-card";
import { Card, EmptyState, StatusBadge } from "@/components/ui/surface";
import { BarChart3, FileText, ShoppingCart } from "lucide-react";

export default async function PanelCeoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CEO" && session.role !== "ADMINISTRADOR") redirect("/app");

  const snap = await ceoPanelSnapshot(session.activeCompany.id);

  return (
    <div>
      <PageHeader
        eyebrow="Dirección"
        title="Panel ejecutivo"
        description={`Visión operativa de ${session.activeCompany.displayName}. Los indicadores no consolidan empresas.`}
        actions={<Link href="/app/paneles/reportes" className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Ver reportes</Link>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Cotizaciones por definir" value={snap.pendingQuotes.length} icon={FileText} href="/app/cotizaciones/pendientes" />
        <MetricCard label="O.C. por autorizar" value={snap.pendingOc.length} icon={ShoppingCart} href="/app/compras" tone="amber" />
        <MetricCard label="Empresa activa" value={session.activeCompany.code} icon={BarChart3} />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Pendientes de cotizar</h2></div>
        {snap.pendingQuotes.length === 0 ? <EmptyState title="Sin precios pendientes" /> : <ul className="divide-y text-sm">
          {snap.pendingQuotes.map((q) => (
            <li key={q.id} className="flex items-center justify-between px-5 py-3">
              <Link href={`/app/cotizaciones/${q.id}`} className="font-mono font-semibold text-accent">{q.folio}</Link>
              <StatusBadge status="PENDIENTE" />
            </li>
          ))}
        </ul>}
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">O.C. por autorizar</h2></div>
        {snap.pendingOc.length === 0 ? <EmptyState title="Sin órdenes pendientes" /> : <ul className="divide-y text-sm">
          {snap.pendingOc.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
              <span className="font-mono font-semibold text-accent">{o.folio}</span>
              <span className="flex-1">{o.description} · ${o.amountMxn}</span>
              <form action={authorizePurchaseOrderAction}>
                <input type="hidden" name="purchaseOrderId" value={o.id} />
                <button type="submit" className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white">Autorizar</button>
              </form>
            </li>
          ))}
        </ul>}
      </Card>
      </div>
    </div>
  );
}
