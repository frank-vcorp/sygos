import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { getSession } from "@/lib/session";
import { listQuotesWithClients } from "./actions";
import { PageHeader } from "@/components/patterns/page-header";
import { DataTable } from "@/components/patterns/data-table";
import { MetricCard } from "@/components/patterns/metric-card";
import { EmptyState, StatusBadge } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";
import { formatMxnDisplay } from "@/lib/format-currency";

const ORIGIN_SHORT: Record<string, string> = {
  COTIZACION_INICIADA: "Iniciada",
  DIAGNOSTICO_VALIDADO: "Diagnóstico",
  REPARACION_PENDIENTE_PRECIO: "Reparación",
  GARANTIA_NO_PROCEDENTE: "Garantía",
  MOT_INTERCOMPANIA: "Interco.",
  VENTA_EQUIPO: "Venta equipo",
  SERVICIO_EN_CAMPO: "Campo",
};

export default async function CotizacionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const rows = await listQuotesWithClients(session.activeCompany.id);
  const pendingPrice = rows.filter((r) => r.quote.pendingPricing).length;
  const sent = rows.filter((r) => r.quote.status === "ENVIADA").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comercial"
        title="Cotizaciones"
        description="Gestiona precios, envíos y decisiones comerciales desde una sola bandeja."
        actions={
          <>
            <Link href="/app/cotizaciones/pendientes" className={buttonVariants({ variant: "secondary" })}>
              Pendientes de precio
              {pendingPrice > 0 && (
                <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  {pendingPrice}
                </span>
              )}
            </Link>
            <Link href="/app/cotizaciones/nueva" className={buttonVariants({ variant: "primary" })}>
              <Plus className="size-4" />
              Nueva cotización
            </Link>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total cotizaciones" value={rows.length} icon={FileText} />
        <MetricCard label="Pendientes de precio" value={pendingPrice} icon={FileText} tone="amber" href="/app/cotizaciones/pendientes" />
        <MetricCard label="Enviadas (decisión cliente)" value={sent} icon={FileText} tone="green" />
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-7" />}
          title="Todavía no hay cotizaciones"
          description="Inicia una cotización para dar seguimiento comercial."
          action={
            <Link href="/app/cotizaciones/nueva" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Crear cotización
            </Link>
          }
        />
      ) : (
        <DataTable title="Seguimiento comercial" description={`${rows.length} cotizaciones en ${session.activeCompany.displayName}`}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Folio</th>
                <th className="px-5 py-3 font-semibold">Cliente</th>
                <th className="px-5 py-3 font-semibold">Origen</th>
                <th className="px-5 py-3 font-semibold">Total</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(({ quote: q, clientName }) => (
                <tr key={q.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-accent">{q.folio}</td>
                  <td className="px-5 py-3 font-medium">{clientName}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">
                    {q.pendingOrigin ? (ORIGIN_SHORT[q.pendingOrigin] ?? q.pendingOrigin) : "—"}
                  </td>
                  <td className="px-5 py-3 font-medium">
                    {q.pendingPricing ? (
                      <span className="text-amber-700">Sin precio</span>
                    ) : (
                      formatMxnDisplay(q.finalPriceMxn ?? q.priceMxn)
                    )}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={q.status} /></td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/app/cotizaciones/${q.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}
    </div>
  );
}
