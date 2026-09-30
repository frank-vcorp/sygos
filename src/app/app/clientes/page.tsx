import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageClients } from "@/lib/permissions";
import { listClients } from "../maestros/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { DataTable } from "@/components/patterns/data-table";
import { StatusBadge } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function ClientesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await listClients(session.activeCompany.id);

  return (
    <div>
      <PageHeader
        eyebrow="Comercial"
        title="Clientes"
        description={`Directorio comercial de ${session.activeCompany.displayName}.`}
        actions={
          canManageClients(session.role, session.activeCompany.code) && (
          <Link
            href="/app/clientes/nuevo"
            className={buttonVariants({ variant: "primary" })}
          >
            <Plus className="size-4" />
            Nuevo cliente
          </Link>
          )
        }
      />
      <DataTable title="Directorio" description={`${rows.length} clientes registrados`}>
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3">Folio</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Crédito (días)</th>
              <th className="px-4 py-3">Factura</th>
              <th className="px-4 py-3">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Sin clientes en {session.activeCompany.displayName}.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.folio ?? "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/app/clientes/${row.id}`} className="font-medium text-accent hover:underline">
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.creditDays}</td>
                <td className="px-4 py-3">{row.requiresInvoice ? "Sí" : "No"}</td>
                <td className="px-4 py-3">
                  {row.isIntercompany ? <StatusBadge status="INTERCOMPAÑÍA" /> : <span className="text-slate-500">Normal</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}
