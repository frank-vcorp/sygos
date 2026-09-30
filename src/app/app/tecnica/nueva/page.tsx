import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listEquiForCompany, listMotVisible } from "../../activos/actions";
import { createAttendanceAction } from "../actions";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";

export default async function NuevaAtencionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const equi = session.activeCompany.code === "SYSTRON" ? await listEquiForCompany(session.activeCompany.id) : [];
  const mot = await listMotVisible();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        eyebrow="Operación"
        title="Nueva atención"
        description="Diagnóstico, reparación preautorizada o diagnóstico de garantía."
        breadcrumbs={[{ label: "Técnica", href: "/app/tecnica" }, { label: "Nueva" }]}
      />
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
              EQUI (opcional)
              <select name="equiId" className="mt-1 w-full rounded-md border border-border px-3 py-2">
                <option value="">—</option>
                {equi.map((e) => (
                  <option key={e.id} value={e.id}>{e.folio}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            MOT (opcional)
            <select name="motId" className="mt-1 w-full rounded-md border border-border px-3 py-2">
              <option value="">—</option>
              {mot.map((m) => (
                <option key={m.id} value={m.id}>{m.folio}</option>
              ))}
            </select>
          </label>
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
            <button type="submit" className={buttonVariants({ variant: "primary" })}>Crear</button>
            <Link href="/app/tecnica" className={buttonVariants({ variant: "secondary" })}>Cancelar</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
