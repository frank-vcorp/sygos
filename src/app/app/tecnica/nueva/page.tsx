import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listEquiForCompany, listMotVisible } from "../../activos/actions";
import { createAttendanceAction } from "../actions";

export default async function NuevaAtencionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const equi = session.activeCompany.code === "SYSTRON" ? await listEquiForCompany(session.activeCompany.id) : [];
  const mot = await listMotVisible();

  return (
    <form action={createAttendanceAction} className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-6">
      <h1 className="text-xl font-semibold">Nueva atención</h1>
      <p className="text-xs text-slate-600">
        Tipos: Diagnóstico, Reparación preautorizada, Diagnóstico de Garantía. No existe reparación urgente. En SYSTRON, MOT
        SYSTRON solo admite Diagnóstico de Garantía (ejecución en Servomotores).
      </p>
      <label className="block text-sm">
        Tipo
        <select name="attentionType" className="mt-1 w-full rounded border px-3 py-2">
          <option value="DIAGNOSTICO">Diagnóstico</option>
          <option value="REPARACION">Reparación preautorizada</option>
          <option value="DIAGNOSTICO_GARANTIA">Diagnóstico de Garantía</option>
        </select>
      </label>
      {equi.length > 0 && (
        <label className="block text-sm">
          EQUI (opcional)
          <select name="equiId" className="mt-1 w-full rounded border px-3 py-2">
            <option value="">—</option>
            {equi.map((e) => (
              <option key={e.id} value={e.id}>{e.folio}</option>
            ))}
          </select>
        </label>
      )}
      <label className="block text-sm">
        MOT (opcional)
        <select name="motId" className="mt-1 w-full rounded border px-3 py-2">
          <option value="">—</option>
          {mot.map((m) => (
            <option key={m.id} value={m.id}>{m.folio}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Prioridad diagnóstico
        <select name="priority" className="mt-1 w-full rounded border px-3 py-2">
          <option value="NORMAL">Normal</option>
          <option value="ALTA">Alta</option>
          <option value="EXPRESS">Exprés</option>
        </select>
      </label>
      <label className="block text-sm">
        Prioridad reparación (catálogo propio)
        <select name="repairPriority" className="mt-1 w-full rounded border px-3 py-2">
          <option value="NORMAL">Normal (0%)</option>
          <option value="ALTA">Alta (+10%)</option>
          <option value="EXPRESS">Exprés (+20%)</option>
        </select>
      </label>
      <label className="block text-sm">
        Falla reportada
        <textarea name="reportedFault" rows={3} className="mt-1 w-full rounded border px-3 py-2" />
      </label>
      <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm text-white">Crear</button>
    </form>
  );
}
