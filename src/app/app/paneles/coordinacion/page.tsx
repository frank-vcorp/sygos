import { redirect } from "next/navigation";
import { coordinationPanelSnapshot } from "@/lib/panel-queries";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/patterns/page-header";
import { MetricCard } from "@/components/patterns/metric-card";
import { Card, EmptyState } from "@/components/ui/surface";
import { ClipboardList, FileText, ReceiptText, ShoppingCart, WalletCards } from "lucide-react";

export default async function PanelCoordinacionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["COORDINACION_ADMIN", "ADMINISTRADOR", "CEO"].includes(session.role)) redirect("/app");
  const snap = await coordinationPanelSnapshot(session.activeCompany.id);

  return (
    <div>
      <PageHeader
        eyebrow="Panel operativo"
        title="Coordinación administrativa"
        description={`Pendientes financieros y administrativos de ${session.activeCompany.displayName}.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Facturas" value={snap.invoices} icon={FileText} href="/app/finanzas" />
        <MetricCard label="Remisiones" value={snap.remissions} icon={ReceiptText} href="/app/finanzas" tone="green" />
        <MetricCard label="Pagos por validar" value={snap.paymentsPending.length} icon={WalletCards} href="/app/finanzas" tone="amber" />
        <MetricCard label="O.C. autorizadas" value={snap.purchaseOrdersAuthorized.length} icon={ShoppingCart} href="/app/compras" />
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Solicitudes de documento</h2>
          <p className="text-xs text-slate-500">Documentos pendientes de atención</p>
        </div>
        {snap.documentRequests.length === 0 ? (
          <EmptyState icon={<ClipboardList className="size-6" />} title="Sin solicitudes pendientes" />
        ) : <ul className="divide-y text-sm">
          {snap.documentRequests.map((d) => (
            <li key={d.id} className="px-5 py-3 font-medium">{d.requestType}</li>
          ))}
        </ul>}
      </Card>
    </div>
  );
}
