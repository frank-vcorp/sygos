import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Stethoscope, Warehouse } from "lucide-react";
import { gerenteSystronHomeSnapshot } from "@/lib/panel-queries";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/patterns/page-header";
import { MetricCard } from "@/components/patterns/metric-card";
import { Card } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";

export default async function PanelGerenteSystronPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (
    session.role !== "GERENTE_OPERATIVO_SYSTRON" &&
    session.role !== "CEO" &&
    session.role !== "ADMINISTRADOR"
  ) {
    redirect("/app");
  }
  if (session.activeCompany.code !== "SYSTRON" && session.role === "GERENTE_OPERATIVO_SYSTRON") {
    redirect("/app");
  }
  const snap = await gerenteSystronHomeSnapshot(session.activeCompany.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Análisis"
        title="Gerencia SYSTRON"
        description={`Operación técnica, almacén EQUI y pendientes comerciales de ${session.activeCompany.displayName}.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Diagnósticos por validar"
          value={snap.pendingValidation.length}
          icon={Stethoscope}
          href="/app/tecnica"
          tone="amber"
        />
        <MetricCard
          label="EQUI sin entrada"
          value={snap.equiSinEntrada}
          icon={Warehouse}
          href="/app/almacen"
        />
        <MetricCard
          label="COT sin precio (CEO)"
          value={snap.pendingQuotes.length}
          icon={FileText}
          href="/app/cotizaciones/pendientes"
        />
      </div>

      <Card className="p-5 text-sm">
        <h2 className="font-semibold">Validación técnica pendiente</h2>
        <ul className="mt-2 space-y-1">
          {snap.pendingValidation.map((row) => (
            <li key={row.attendanceId}>
              <Link href={`/app/tecnica/${row.attendanceId}`} className="text-accent hover:underline">
                {row.equiFolio ?? "Atención"} · {row.attentionType.replaceAll("_", " ")}
              </Link>
            </li>
          ))}
          {snap.pendingValidation.length === 0 && <li className="text-slate-500">Ninguno.</li>}
        </ul>
      </Card>

      <Card className="p-5 text-sm">
        <h2 className="font-semibold">Cotizaciones sin precio CEO</h2>
        <ul className="mt-2 space-y-1">
          {snap.pendingQuotes.map((q) => (
            <li key={q.id}>
              <Link href={`/app/cotizaciones/${q.id}`} className="text-accent hover:underline">
                {q.folio}
              </Link>
            </li>
          ))}
          {snap.pendingQuotes.length === 0 && <li className="text-slate-500">Ninguna.</li>}
        </ul>
        <Link href="/app/cotizaciones/pendientes" className={`${buttonVariants({ variant: "ghost", size: "sm" })} mt-3 inline-flex`}>
          Ver bandeja pendientes
        </Link>
      </Card>
    </div>
  );
}
