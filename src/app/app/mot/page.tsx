import Link from "next/link";
import { redirect } from "next/navigation";
import { Cog, Plus, Truck } from "lucide-react";
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
import { MetricCard } from "@/components/patterns/metric-card";
import { SectionCard } from "@/components/patterns/section-card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, StatusBadge } from "@/components/ui/surface";

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE_INGRESO_SERVOMOTORES: "Pendiente ingreso",
  EN_RESGUARDO_SERVOMOTORES: "En resguardo",
  SALIDA_PRUEBA: "Salida a prueba",
  EGRESADO: "Egresado",
};

export default async function MotPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewMot(session)) redirect("/app");

  const [rows, pending] = await Promise.all([listMotVisible(), listPendingMotIngress()]);
  const inCustody = rows.filter((r) => r.custodyStatus === "EN_RESGUARDO_SERVOMOTORES").length;
  const egressed = rows.filter((r) => r.custodyStatus === "EGRESADO").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Activos"
        title="Motores MOT"
        description={
          session.activeCompany.code === "SYSTRON"
            ? "Motores originados en SYSTRON con operación técnica en Servomotores."
            : "Motores propios y de SYSTRON en custodia Servomotores."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canCreateMot(session) && (
              <Link href="/app/mot/nuevo" className={buttonVariants({ variant: "primary" })}>
                <Plus className="size-4" />
                Nuevo MOT
              </Link>
            )}
            <Link href="/app/mot/servomotores" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Vista SM
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="MOT visibles" value={rows.length} icon={Cog} />
        <MetricCard label="En resguardo" value={inCustody} icon={Truck} tone="green" />
        <MetricCard
          label="Pendientes ingreso"
          value={pending.length}
          icon={Truck}
          tone={pending.length ? "amber" : "blue"}
        />
      </div>

      {canConfirmMotIngress(session) && pending.length > 0 && (
        <SectionCard
          icon={Truck}
          title="Pendientes de ingreso físico"
          description="Confirma ingreso en Servomotores para iniciar SLA y custodia."
          tone="accent"
        >
          <ul className="divide-y rounded-xl border border-border text-sm">
            {pending.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  <span className="font-mono text-xs font-semibold text-accent">{m.folio}</span>
                  <span className="ml-2 text-slate-600">{m.model}</span>
                  {m.brand && <span className="text-slate-500"> · {m.brand}</span>}
                </span>
                <Link href={`/app/mot/${m.id}`} className={buttonVariants({ variant: "primary", size: "sm" })}>
                  Confirmar ingreso
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<Cog className="size-7" />}
          title="Sin motores MOT"
          description="Crea un MOT desde SYSTRON o Servomotores según el origen del cliente."
          action={
            canCreateMot(session) ? (
              <Link href="/app/mot/nuevo" className={buttonVariants({ variant: "primary", size: "sm" })}>Nuevo MOT</Link>
            ) : undefined
          }
        />
      ) : (
        <DataTable title="Registro MOT" description="Folio global — abre la ficha para custodia, técnica y bitácora.">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Folio</th>
                <th className="px-5 py-3 font-semibold">Origen</th>
                <th className="px-5 py-3 font-semibold">Motor</th>
                <th className="px-5 py-3 font-semibold">Serial</th>
                <th className="px-5 py-3 font-semibold">Custodia</th>
                <th className="px-5 py-3 text-right font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-accent">{row.folio}</td>
                  <td className="px-5 py-3">{row.originCompanyCode === "SYSTRON" ? "SYSTRON" : "Servomotores"}</td>
                  <td className="px-5 py-3">
                    <span className="font-medium">{row.model}</span>
                    {row.brand && <span className="block text-xs text-slate-500">{row.brand}</span>}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">{row.manufacturerSerial ?? "—"}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={row.custodyStatus} />
                    <span className="mt-0.5 block text-[10px] text-slate-500">
                      {STATUS_LABEL[row.custodyStatus] ?? row.custodyStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/app/mot/${row.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Ver ficha
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
