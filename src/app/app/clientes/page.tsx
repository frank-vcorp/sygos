import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Plus, Users } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManageClients } from "@/lib/permissions";
import { listClients } from "../maestros/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { DataTable } from "@/components/patterns/data-table";
import { MetricCard } from "@/components/patterns/metric-card";
import { StatusBadge } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";

export default async function ClientesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await listClients(session.activeCompany.id);
  const intercompany = rows.filter((r) => r.isIntercompany).length;
  const withInvoice = rows.filter((r) => r.requiresInvoice).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comercial"
        title="Clientes"
        description={`Directorio comercial de ${session.activeCompany.displayName}.`}
        actions={
          canManageClients(session.role, session.activeCompany.code) && (
            <Link href="/app/clientes/nuevo" className={buttonVariants({ variant: "primary" })}>
              <Plus className="size-4" />
              Nuevo cliente
            </Link>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Clientes activos" value={rows.length} icon={Users} />
        <MetricCard label="Con factura obligatoria" value={withInvoice} icon={Building2} tone="amber" />
        <MetricCard label="Intercompañía" value={intercompany} icon={Building2} tone="green" />
      </div>
      <DataTable title="Directorio" description="Abre la ficha para contactos, comunicaciones e historial.">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Folio</th>
              <th className="px-5 py-3 font-semibold">Nombre</th>
              <th className="px-5 py-3 font-semibold">Crédito</th>
              <th className="px-5 py-3 font-semibold">Factura</th>
              <th className="px-5 py-3 font-semibold">Tipo</th>
              <th className="px-5 py-3 font-semibold text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                  Sin clientes en {session.activeCompany.displayName}.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/80">
                <td className="px-5 py-3 font-mono text-xs text-slate-500">{row.folio ?? "—"}</td>
                <td className="px-5 py-3 font-semibold">{row.name}</td>
                <td className="px-5 py-3">{row.creditDays} días</td>
                <td className="px-5 py-3">{row.requiresInvoice ? "Sí" : "No"}</td>
                <td className="px-5 py-3">
                  {row.isIntercompany ? <StatusBadge status="INTERCOMPAÑÍA" /> : <span className="text-slate-500">Normal</span>}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/app/clientes/${row.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    Ver ficha
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}
