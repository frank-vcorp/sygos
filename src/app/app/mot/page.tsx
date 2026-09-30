import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  canConfirmMotIngress,
  canCreateMot,
  canViewMot,
  listMotVisible,
  listPendingMotIngress,
} from "../activos/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { DataTable } from "@/components/patterns/data-table";
import { StatusBadge } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE_INGRESO_SERVOMOTORES: "Pendiente ingreso",
  EN_RESGUARDO_SERVOMOTORES: "En resguardo",
  EGRESADO: "Egresado",
};

export default async function MotPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewMot(session)) redirect("/app");

  const [rows, pending] = await Promise.all([listMotVisible(), listPendingMotIngress()]);

  return (
    <div>
      <PageHeader
        eyebrow="Activos"
        title="Motores MOT"
        description={
          session.activeCompany.code === "SYSTRON"
            ? "Motores originados en SYSTRON con ejecución técnica en Servomotores."
            : "Motores propios y provenientes de SYSTRON en custodia Servomotores."
        }
        actions={canCreateMot(session) && (
          <Link href="/app/mot/nuevo" className={buttonVariants({ variant: "primary" })}>
            <Plus className="size-4" />
            Nuevo MOT
          </Link>
        )}
      />

      {canConfirmMotIngress(session) && pending.length > 0 && (
        <section className="mb-6 rounded-2xl border border-amber-200 bg-warning-muted p-5">
          <h2 className="text-sm font-semibold text-amber-900">Pendientes de ingreso físico ({pending.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {pending.map((m) => (
              <li key={m.id}>
                <Link href={`/app/mot/${m.id}`} className="font-mono text-accent hover:underline">
                  {m.folio}
                </Link>
                <span className="text-slate-600"> · {m.model}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DataTable title="Registro MOT" description={`${rows.length} motores visibles en el contexto actual`}>
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3">Folio</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">Custodia</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/app/mot/${row.id}`} className="text-accent hover:underline">
                    {row.folio}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.originCompanyCode === "SYSTRON" ? "SYSTRON" : "Servomotores"}</td>
                <td className="px-4 py-3">{row.model}</td>
                <td className="px-4 py-3"><StatusBadge status={STATUS_LABEL[row.custodyStatus] ?? row.custodyStatus} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Sin MOT registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}
