import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageSuppliers } from "@/lib/permissions";
import { listSuppliers } from "../maestros/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { DataTable } from "@/components/patterns/data-table";
import { EmptyState, StatusBadge } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Truck } from "lucide-react";

export default async function ProveedoresPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const rows = await listSuppliers(session.activeCompany.id);
  const canCreate = canManageSuppliers(session.role);

  return (
    <div>
      <PageHeader
        eyebrow="Operación"
        title="Proveedores"
        description={`Directorio de proveedores de ${session.activeCompany.displayName}.`}
        actions={
          canCreate && (
            <Link href="/app/proveedores/nuevo" className={buttonVariants({ variant: "primary" })}>
              <Plus className="size-4" />
              Nuevo proveedor
            </Link>
          )
        }
      />
      {rows.length === 0 ? (
        <EmptyState icon={<Truck className="size-7" />} title="Sin proveedores" description="Registra proveedores para compras y O.C." />
      ) : (
        <DataTable title="Directorio" description={`${rows.length} proveedores`}>
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.folio ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/app/proveedores/${row.id}`} className="font-medium text-accent hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.contactName ?? "—"}</td>
                  <td className="px-4 py-3">
                    {row.isIntercompany ? <StatusBadge status="INTERCOMPAÑÍA" /> : <span className="text-slate-500">Normal</span>}
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
