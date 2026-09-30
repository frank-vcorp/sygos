import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canCreateEqui, canViewEqui, listEquiForCompany } from "../activos/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { DataTable } from "@/components/patterns/data-table";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function EquiPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewEqui(session)) redirect("/app");

  const rows = await listEquiForCompany(session.activeCompany.id);

  return (
    <div>
      <PageHeader
        eyebrow="Activos"
        title="Equipos EQUI"
        description="Identidad y trazabilidad de equipos SYSTRON que no pertenecen al flujo MOT."
        actions={canCreateEqui(session) && (
          <Link href="/app/equi/nuevo" className={buttonVariants({ variant: "primary" })}>
            <Plus className="inline size-4" />{" "}
            Nuevo EQUI
          </Link>
        )}
      />
      <DataTable title="Registro de equipos" description={`${rows.length} equipos registrados`}>
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3">Folio</th>
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">Marca</th>
              <th className="px-4 py-3">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/app/equi/${row.id}`} className="text-accent hover:underline">
                    {row.folio}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.model}</td>
                <td className="px-4 py-3">{row.brand ?? "—"}</td>
                <td className="px-4 py-3">{row.equipmentType ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Sin equipos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}
