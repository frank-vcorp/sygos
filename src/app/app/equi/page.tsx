import Link from "next/link";
import { redirect } from "next/navigation";
import { Cpu, Plus, Warehouse } from "lucide-react";
import { getSession } from "@/lib/session";
import { canCreateEqui, canViewEqui, listEquiWithClients } from "../activos/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { DataTable } from "@/components/patterns/data-table";
import { MetricCard } from "@/components/patterns/metric-card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, StatusBadge } from "@/components/ui/surface";

const WH_LABEL: Record<string, string> = {
  SIN_ENTRADA: "Sin entrada",
  EN_RESGUARDO: "En resguardo",
  SALIDA_PRUEBA: "Salida a prueba",
  SALIDA_DEFINITIVA: "Salida definitiva",
};

export default async function EquiPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewEqui(session)) redirect("/app");

  const rows = await listEquiWithClients(session.activeCompany.id);
  const inWarehouse = rows.filter((r) => r.equi.warehouseStatus === "EN_RESGUARDO").length;
  const noEntry = rows.filter((r) => r.equi.warehouseStatus === "SIN_ENTRADA").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Activos"
        title="Equipos EQUI"
        description="Identidad y trazabilidad de equipos SYSTRON (folio permanente, no el serial)."
        actions={
          canCreateEqui(session) && (
            <Link href="/app/equi/nuevo" className={buttonVariants({ variant: "primary" })}>
              <Plus className="size-4" />
              Nuevo EQUI
            </Link>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Equipos activos" value={rows.length} icon={Cpu} />
        <MetricCard label="En resguardo" value={inWarehouse} icon={Warehouse} tone="green" />
        <MetricCard label="Sin entrada física" value={noEntry} icon={Warehouse} tone={noEntry ? "amber" : "blue"} />
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={<Cpu className="size-7" />}
          title="Sin equipos EQUI"
          description="Registra el primer equipo vinculado a un cliente SYSTRON."
          action={
            canCreateEqui(session) ? (
              <Link href="/app/equi/nuevo" className={buttonVariants({ variant: "primary", size: "sm" })}>Crear EQUI</Link>
            ) : undefined
          }
        />
      ) : (
        <DataTable title="Registro de equipos" description="Abre el folio para historial de almacén y datos de placa.">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Folio</th>
                <th className="px-5 py-3 font-semibold">Cliente</th>
                <th className="px-5 py-3 font-semibold">Modelo</th>
                <th className="px-5 py-3 font-semibold">Almacén</th>
                <th className="px-5 py-3 text-right font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(({ equi: row, clientName }) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-accent">{row.folio}</td>
                  <td className="px-5 py-3">{clientName}</td>
                  <td className="px-5 py-3">
                    <span className="font-medium">{row.model}</span>
                    {row.brand && <span className="mt-0.5 block text-xs text-slate-500">{row.brand}</span>}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={row.warehouseStatus} />
                    <span className="mt-0.5 block text-[10px] text-slate-500">
                      {WH_LABEL[row.warehouseStatus] ?? row.warehouseStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/app/equi/${row.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Ver ficha
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
