import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listQuotes } from "./actions";
import { PageHeader } from "@/components/patterns/page-header";
import { DataTable } from "@/components/patterns/data-table";
import { EmptyState, StatusBadge } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

export default async function CotizacionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const rows = await listQuotes(session.activeCompany.id);

  return (
    <div>
      <PageHeader
        eyebrow="Comercial"
        title="Cotizaciones"
        description="Gestiona precios, envíos y decisiones comerciales desde una sola bandeja."
        actions={
          <>
            <Link href="/app/cotizaciones/pendientes" className={buttonVariants({ variant: "secondary" })}>
              Pendientes de precio
            </Link>
            <Link href="/app/cotizaciones/nueva" className={buttonVariants({ variant: "primary" })}>
              <Plus className="size-4" />
              Nueva cotización
            </Link>
          </>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-7" />}
          title="Todavía no hay cotizaciones"
          description="Inicia una cotización para dar seguimiento comercial."
        />
      ) : (
        <DataTable title="Seguimiento comercial" description={`${rows.length} cotizaciones en ${session.activeCompany.displayName}`}>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Estado</th>
                <th className="text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id}>
                  <td className="font-mono text-xs font-semibold text-accent">{q.folio}</td>
                  <td><StatusBadge status={q.status} /></td>
                  <td className="text-right">
                    <Link href={`/app/cotizaciones/${q.id}`} className="text-sm font-semibold text-accent hover:underline">
                      Abrir detalle
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
