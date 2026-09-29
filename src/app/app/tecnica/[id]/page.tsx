import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { diagnoses, serviceOrders } from "@/db/schema";
import { getSession } from "@/lib/session";
import {
  addTechnicalLogAction,
  createServiceOrderAction,
  getAttendance,
  validateDiagnosisAction,
} from "../actions";

export default async function AtencionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const att = await getAttendance(id, session.activeCompany.id);
  if (!att) notFound();

  const db = getDb();
  const diag = await db.select().from(diagnoses).where(eq(diagnoses.attendanceId, id)).limit(1);
  const os = await db.select().from(serviceOrders).where(eq(serviceOrders.attendanceId, id)).limit(1);

  return (
    <div className="space-y-4">
      <Link href="/app/tecnica" className="text-sm text-accent">← Técnica</Link>
      <h1 className="text-xl font-semibold">{att.attentionType.replaceAll("_", " ")}</h1>
      <p className="text-sm text-slate-600">{att.reportedFault}</p>
      {diag[0] && (
        <p className="text-sm">
          Diagnóstico: {diag[0].priority} · {diag[0].status} · snapshot ${diag[0].snapshotPriceMxn} MXN / SLA {diag[0].snapshotSlaDays}d
        </p>
      )}
      {diag[0] && diag[0].status !== "VALIDADO_GERENTE" && (
        <form action={validateDiagnosisAction}>
          <input type="hidden" name="diagnosisId" value={diag[0].id} />
          <button type="submit" className="rounded border px-3 py-1 text-sm">Validar gerente</button>
        </form>
      )}
      {os.length === 0 && (
        <form action={createServiceOrderAction}>
          <input type="hidden" name="attendanceId" value={att.id} />
          <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm text-white">Crear OS</button>
        </form>
      )}
      {os[0] && <p className="text-sm">OS: {os[0].folio} — {os[0].status.replaceAll("_", " ")}</p>}
      <form action={addTechnicalLogAction} className="space-y-2 rounded border border-border p-4">
        <input type="hidden" name="attendanceId" value={att.id} />
        {att.motId && <input type="hidden" name="motId" value={att.motId} />}
        <textarea name="body" required rows={2} placeholder="Entrada bitácora (inmutable)" className="w-full rounded border px-2 py-1 text-sm" />
        <button type="submit" className="text-sm text-accent">Agregar a bitácora</button>
      </form>
    </div>
  );
}
