import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listPendingQuote } from "../actions";
import { PageHeader } from "@/components/patterns/page-header";
import { DataTable } from "@/components/patterns/data-table";
import { EmptyState } from "@/components/ui/surface";
import { FileText } from "lucide-react";

export default async function PendientesCotizarPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const rows = await listPendingQuote(session.activeCompany.id);

  return (
    <div>
      <PageHeader
        eyebrow="Comercial"
        title="Pendientes de precio"
        description="Cotizaciones que requieren definición de precio por CEO o Administrador."
        breadcrumbs={[{ label: "Cotizaciones", href: "/app/cotizaciones" }, { label: "Pendientes" }]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<FileText className="size-7" />} title="Bandeja vacía" description="No hay cotizaciones pendientes de precio." />
      ) : (
        <DataTable title="Por cotizar" description={`${rows.length} en cola`}>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-accent">{q.folio}</td>
                  <td className="px-4 py-3 text-slate-600">{q.pendingOrigin?.replaceAll("_", " ") ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/app/cotizaciones/${q.id}`} className="text-sm font-semibold text-accent hover:underline">
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
