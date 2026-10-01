import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageTechnicalState } from "@/lib/permissions-tecnica";
import { getSession } from "@/lib/session";
import { getEqui, listEquiForCompany, listMotVisible } from "../../activos/actions";
import { createAttendanceAction } from "../actions";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";

export default async function NuevaAtencionPage({
  searchParams,
}: {
  searchParams: Promise<{ equiId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageTechnicalState(session, session.activeCompany.id)) redirect("/app");
  const { equiId: preselectedEquiId } = await searchParams;

  const equi = session.activeCompany.code === "SYSTRON" ? await listEquiForCompany(session.activeCompany.id) : [];
  const mot = await listMotVisible();

  const preselected =
    preselectedEquiId && session.activeCompany.code === "SYSTRON"
      ? await getEqui(session.activeCompany.id, preselectedEquiId)
      : null;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        eyebrow="Operación"
        title="Nueva atención"
        description={
          preselected
            ? `Vinculada a ${preselected.folio}. El equipo debe tener entrada física registrada.`
            : "Diagnóstico, reparación preautorizada o diagnóstico de garantía."
        }
        breadcrumbs={[
          { label: "Técnica", href: "/app/tecnica" },
          ...(preselected ? [{ label: preselected.folio, href: `/app/equi/${preselected.id}` }] : []),
          { label: "Nueva" },
        ]}
      />
      {preselected?.warehouseStatus === "SIN_ENTRADA" && (
        <Card className="mb-4 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Este EQUI aún no tiene entrada física.{" "}
          <Link href={`/app/equi/${preselected.id}`} className="font-semibold underline">
            Regístrala en el detalle del equipo
          </Link>{" "}
          antes de crear la atención.
        </Card>
      )}
      <Card className="p-6">
        <form action={createAttendanceAction} className="space-y-4">
          <p className="text-xs text-slate-600">
            En SYSTRON, MOT SYSTRON solo admite Diagnóstico de Garantía (ejecución en Servomotores).
          </p>
          <label className="block text-sm">
            Tipo
            <select name="attentionType" className="mt-1 w-full rounded-md border border-border px-3 py-2">
              <option value="DIAGNOSTICO">Diagnóstico</option>
              <option value="REPARACION">Reparación preautorizada</option>
              <option value="DIAGNOSTICO_GARANTIA">Diagnóstico de Garantía</option>
            </select>
          </label>
          {equi.length > 0 && (
            <label className="block text-sm">
              EQUI {preselected ? "(requerido)" : "(opcional)"}
              <select
                name="equiId"
                defaultValue={preselected?.id ?? ""}
                required={Boolean(preselected)}
                className="mt-1 w-full rounded-md border border-border px-3 py-2"
              >
                {!preselected && <option value="">—</option>}
                {equi.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.folio} · {WH_SHORT[e.warehouseStatus] ?? e.warehouseStatus}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!preselected && (
            <label className="block text-sm">
              MOT (opcional)
              <select name="motId" className="mt-1 w-full rounded-md border border-border px-3 py-2">
                <option value="">—</option>
                {mot.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.folio}
                  </option>
                ))}
              </select>
            </label>
          )}
          {preselected && <input type="hidden" name="motId" value="" />}
          <label className="block text-sm">
            Prioridad diagnóstico
            <select name="priority" className="mt-1 w-full rounded-md border border-border px-3 py-2">
              <option value="NORMAL">Normal</option>
              <option value="ALTA">Alta</option>
              <option value="EXPRESS">Exprés</option>
            </select>
          </label>
          <label className="block text-sm">
            Prioridad reparación
            <select name="repairPriority" className="mt-1 w-full rounded-md border border-border px-3 py-2">
              <option value="NORMAL">Normal (0%)</option>
              <option value="ALTA">Alta (+10%)</option>
              <option value="EXPRESS">Exprés (+20%)</option>
            </select>
          </label>
          <label className="block text-sm">
            Falla reportada
            <textarea name="reportedFault" rows={3} className="mt-1 w-full rounded-md border border-border px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              className={buttonVariants({ variant: "primary" })}
              disabled={preselected?.warehouseStatus === "SIN_ENTRADA"}
            >
              Crear
            </button>
            <Link
              href={preselected ? `/app/equi/${preselected.id}` : "/app/tecnica"}
              className={buttonVariants({ variant: "secondary" })}
            >
              Cancelar
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

const WH_SHORT: Record<string, string> = {
  SIN_ENTRADA: "sin entrada",
  EN_RESGUARDO: "en resguardo",
  SALIDA_PRUEBA: "salida prueba",
  SALIDA_DEFINITIVA: "egresado",
};
