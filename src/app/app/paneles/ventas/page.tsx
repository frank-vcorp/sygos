import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listQuotes } from "../../cotizaciones/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { DataTable } from "@/components/patterns/data-table";
import { StatusBadge } from "@/components/ui/surface";

export default async function PanelVentasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "VENTAS_SYSTRON" && session.role !== "CEO" && session.role !== "ADMINISTRADOR") {
    redirect("/app");
  }
  const quotes = await listQuotes(session.activeCompany.id);

  return (
    <div>
      <PageHeader
        eyebrow="Análisis"
        title="Mis ventas"
        description="Seguimiento comercial sin costos internos ni base Servomotores."
      />
      <DataTable title="Cotizaciones" description={`${quotes.length} registros`}>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3">Folio</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Precio cliente</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id}>
                <td className="px-4 py-3">
                  <Link href={`/app/cotizaciones/${q.id}`} className="font-mono text-xs font-semibold text-accent hover:underline">
                    {q.folio}
                  </Link>
                </td>
                <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                <td className="px-4 py-3">
                  {q.finalPriceMxn != null && session.role === "VENTAS_SYSTRON"
                    ? `$${q.finalPriceMxn.toLocaleString("es-MX")} MXN`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}
