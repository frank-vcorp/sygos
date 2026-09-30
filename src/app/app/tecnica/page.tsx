import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ClipboardList, Plus, Stethoscope, Wrench } from "lucide-react";
import { getSession } from "@/lib/session";
import { listAttendancesForBoard } from "./actions";
import { PageHeader } from "@/components/patterns/page-header";
import { MetricCard } from "@/components/patterns/metric-card";
import { DataTable } from "@/components/patterns/data-table";
import { EmptyState, StatusBadge } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";

const TYPE_LABEL: Record<string, string> = {
  DIAGNOSTICO: "Diagnóstico",
  REPARACION: "Reparación",
  DIAGNOSTICO_GARANTIA: "Diagnóstico garantía",
};

export default async function TecnicaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const rows = await listAttendancesForBoard(session.activeCompany.id);

  const open = rows.filter((r) => r.attendance.status === "ABIERTA").length;
  const inDiag = rows.filter((r) => r.diagnosisStatus && r.diagnosisStatus !== "VALIDADO_GERENTE").length;
  const validated = rows.filter((r) => r.diagnosisStatus === "VALIDADO_GERENTE").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operación"
        title="Operación técnica"
        description={`Atenciones activas en ${session.activeCompany.displayName} — diagnóstico, reparación y trazabilidad.`}
        actions={
          <Link href="/app/tecnica/nueva" className={buttonVariants({ variant: "primary" })}>
            <Plus className="size-4" />
            Nueva atención
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Atenciones activas" value={rows.length} icon={ClipboardList} />
        <MetricCard label="En diagnóstico / flujo" value={inDiag} icon={Stethoscope} tone="amber" />
        <MetricCard label="Diagnósticos validados" value={validated} icon={Activity} tone="green" />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Wrench className="size-7" />}
          title="Sin atenciones activas"
          description="Crea una atención vinculada a un EQUI o MOT para iniciar el flujo técnico."
          action={
            <Link href="/app/tecnica/nueva" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Nueva atención
            </Link>
          }
        />
      ) : (
        <DataTable title="Bandeja técnica" description={`${open} abiertas · ordenadas por última actividad`}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Tipo</th>
                <th className="px-5 py-3 font-semibold">Activo</th>
                <th className="px-5 py-3 font-semibold">Falla / notas</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(({ attendance: a, diagnosisStatus, equiFolio, motFolio }) => (
                <tr key={a.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 font-medium">{TYPE_LABEL[a.attentionType] ?? a.attentionType}</td>
                  <td className="px-5 py-4 font-mono text-xs text-accent">
                    {motFolio ?? equiFolio ?? "—"}
                  </td>
                  <td className="max-w-xs px-5 py-4 text-slate-600">{a.reportedFault ?? "Sin falla reportada"}</td>
                  <td className="px-5 py-4">
                    {diagnosisStatus ? (
                      <StatusBadge status={diagnosisStatus} />
                    ) : (
                      <StatusBadge status={a.status} />
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/app/tecnica/${a.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
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
