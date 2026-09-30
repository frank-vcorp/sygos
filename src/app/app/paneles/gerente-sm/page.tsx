import Link from "next/link";
import { redirect } from "next/navigation";
import { gerenteSmPanelSnapshot } from "@/lib/panel-queries";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/patterns/page-header";
import { MetricCard } from "@/components/patterns/metric-card";
import { Card } from "@/components/ui/surface";
import { FileText, ShoppingCart, WalletCards, Wrench } from "lucide-react";

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
    <div>
      <PageHeader
        eyebrow="Análisis"
        title="Gerencia Servomotores"
        description={`Operación y comercial de ${session.activeCompany.displayName}.`}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Cotizaciones pendientes" value={snap.pendingQuotes.length} icon={FileText} href="/app/cotizaciones/pendientes" />
        <MetricCard label="Comprobaciones" value={snap.pendingReceipts.length} icon={WalletCards} href="/app/finanzas/comprobaciones" tone="amber" />
        <MetricCard label="Compras recientes" value={snap.purchases.length} icon={ShoppingCart} href="/app/compras" />
        <MetricCard label="Producción técnica" value={snap.production.length} icon={Wrench} tone="green" />
      </div>
      <Card className="p-5 text-sm">
        <h2 className="font-semibold">Cotizaciones pendientes de precio</h2>
        <ul className="mt-2 space-y-1">
          {snap.pendingQuotes.map((q) => (
            <li key={q.id}>
              <Link href={`/app/cotizaciones/${q.id}`} className="text-accent hover:underline">{q.folio}</Link>
            </li>
          ))}
          {snap.pendingQuotes.length === 0 && <li className="text-slate-500">Ninguna.</li>}
        </ul>
      </Card>
    </div>
  );
}
