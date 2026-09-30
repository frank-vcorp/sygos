import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageProspects } from "@/lib/permissions";
import { listProspects } from "../maestros/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { DataTable } from "@/components/patterns/data-table";
import { EmptyState, StatusBadge } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";

export default async function ProspectosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const rows = await listProspects(session.activeCompany.id);
  const canCreate = canManageProspects(session.role, session.activeCompany.code);

  return (
    <div>
      <PageHeader
        eyebrow="Comercial"
        title="Prospectos"
        description={`Pipeline comercial de ${session.activeCompany.displayName}.`}
        actions={
          canCreate && (
            <Link href="/app/prospectos/nuevo" className={buttonVariants({ variant: "primary" })}>
              <Plus className="size-4" />
              Nuevo prospecto
            </Link>
          )
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<Target className="size-7" />}
          title="Sin prospectos"
          description="Registra oportunidades antes de convertirlas en clientes."
        />
      ) : (
        <DataTable title="Pipeline" description={`${rows.length} prospectos activos`}>
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Fuente</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.folio ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/app/prospectos/${row.id}`} className="font-medium text-accent hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.source ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
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
