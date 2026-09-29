import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canAssignExternalService, canManageTechnicalState, canReturnDiagnosis, canValidateDiagnosis } from "@/lib/permissions-tecnica";
import { listSuppliers } from "../../maestros/actions";
import {
  addTechnicalLogAction,
  advanceDiagnosisStatusAction,
  ceoOverrideWarrantyAction,
  createServiceOrderAction,
  getAttendanceDetail,
  registerExternalServiceInboundAction,
  registerExternalServiceOutboundAction,
  resolveWarrantyAction,
  returnDiagnosisAction,
  updateRepairStatusAction,
  validateDiagnosisAction,
} from "../actions";

const DIAG_STATUS: Record<string, string> = {
  ABIERTO: "En espera",
  EN_TRABAJO: "En diagnóstico",
  TERMINADO: "Diagnóstico terminado",
  PENDIENTE_VALIDACION_GERENTE: "Pendiente validación Gerente",
  DEVUELTO_CORRECCION: "Devuelto a corrección",
  VALIDADO_GERENTE: "Validado por Gerente",
};

export default async function AtencionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const detail = await getAttendanceDetail(id, session.activeCompany.id);
  if (!detail) notFound();
  const { att, diag, repair, os, corrections, externalCases, production, logs } = detail;
  const canEdit = canManageTechnicalState(session, att.companyId);
  const suppliers =
    session.activeCompany.code === "SYSTRON" ? await listSuppliers(session.activeCompany.id) : [];

  return (
    <div className="space-y-4">
      <Link href="/app/tecnica" className="text-sm text-accent">← Técnica</Link>
      <h1 className="text-xl font-semibold">{att.attentionType.replaceAll("_", " ")}</h1>
      <p className="text-sm text-slate-600">{att.reportedFault ?? "—"}</p>

      {diag && (
        <section className="rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="font-semibold">Diagnóstico</h2>
          <p>
            {diag.priority} · {DIAG_STATUS[diag.status] ?? diag.status} · snapshot ${diag.snapshotPriceMxn} / SLA{" "}
            {diag.snapshotSlaDays}d hábiles (desde ingreso físico del equipo)
          </p>
          {diag.warrantyValidUntil && (
            <p className="text-slate-600">
              Vigencia garantía hasta: {new Date(diag.warrantyValidUntil).toLocaleDateString("es-MX")} (6 meses desde
              salida pagada)
            </p>
          )}
          {diag.warrantyOutcome && diag.warrantyOutcome !== "PENDIENTE" && (
            <p>Garantía: {diag.warrantyOutcome.replaceAll("_", " ")}</p>
          )}
          {production && <p className="text-xs text-slate-500">Producción atribuida (cierre validado).</p>}
          {canEdit && diag.status === "ABIERTO" && (
            <form action={advanceDiagnosisStatusAction} className="mt-2">
              <input type="hidden" name="diagnosisId" value={diag.id} />
              <input type="hidden" name="target" value="EN_TRABAJO" />
              <button type="submit" className="rounded border px-2 py-1 text-xs">Iniciar diagnóstico</button>
            </form>
          )}
          {canEdit && (diag.status === "EN_TRABAJO" || diag.status === "DEVUELTO_CORRECCION") && (
            <form action={advanceDiagnosisStatusAction} className="mt-2">
              <input type="hidden" name="diagnosisId" value={diag.id} />
              <input type="hidden" name="target" value="TERMINADO" />
              <button type="submit" className="rounded bg-accent px-2 py-1 text-xs text-white">Marcar terminado</button>
            </form>
          )}
          {canValidateDiagnosis(session) && diag.status === "PENDIENTE_VALIDACION_GERENTE" && (
            <form action={validateDiagnosisAction} className="mt-2 inline">
              <input type="hidden" name="diagnosisId" value={diag.id} />
              <button type="submit" className="rounded border px-2 py-1 text-xs">Validar gerente</button>
            </form>
          )}
          {canReturnDiagnosis(session) && diag.status === "PENDIENTE_VALIDACION_GERENTE" && (
            <form action={returnDiagnosisAction} className="mt-3 space-y-1 border-t pt-2">
              <input type="hidden" name="diagnosisId" value={diag.id} />
              <input name="reason" required placeholder="Motivo devolución" className="w-full rounded border px-2 py-1 text-xs" />
              <input name="instruction" required placeholder="Instrucción al técnico" className="w-full rounded border px-2 py-1 text-xs" />
              <button type="submit" className="text-xs text-red-700 underline">Devolver a corrección</button>
            </form>
          )}
          {canValidateDiagnosis(session) &&
            att.attentionType === "DIAGNOSTICO_GARANTIA" &&
            diag.status === "VALIDADO_GERENTE" &&
            diag.warrantyOutcome === "PENDIENTE" && (
              <div className="mt-2 flex gap-2">
                <form action={resolveWarrantyAction}>
                  <input type="hidden" name="diagnosisId" value={diag.id} />
                  <input type="hidden" name="outcome" value="PROCEDENTE" />
                  <button type="submit" className="text-xs underline">Garantía procedente</button>
                </form>
                <form action={resolveWarrantyAction}>
                  <input type="hidden" name="diagnosisId" value={diag.id} />
                  <input type="hidden" name="outcome" value="NO_PROCEDENTE" />
                  <button type="submit" className="text-xs underline">No procedente</button>
                </form>
              </div>
            )}
          {diag.warrantyOutcome === "NO_PROCEDENTE" && (session.role === "CEO" || session.role === "ADMINISTRADOR") && (
            <form action={ceoOverrideWarrantyAction} className="mt-2">
              <input type="hidden" name="diagnosisId" value={diag.id} />
              <button type="submit" className="text-xs text-accent underline">CEO: convertir a garantía válida</button>
            </form>
          )}
          {corrections.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {corrections.map((c) => (
                <li key={c.id}>
                  Devolución {new Date(c.createdAt).toLocaleString("es-MX")}: {c.reason} — {c.instruction}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {repair && (
        <section className="rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="font-semibold">Reparación preautorizada</h2>
          <p>
            Prioridad {repair.priority} · +{repair.snapshotIncrementPercent}% · SLA {repair.snapshotSlaDays}d ·{" "}
            {repair.status.replaceAll("_", " ")}
          </p>
          {canEdit && (
            <div className="mt-2 flex flex-wrap gap-1">
              {(["EN_REPARACION", "EN_ESPERA_REFACCIONES", "REPARACION_TERMINADA", "SIN_REPARACION"] as const).map((st) => (
                <form key={st} action={updateRepairStatusAction}>
                  <input type="hidden" name="repairId" value={repair.id} />
                  <input type="hidden" name="status" value={st} />
                  <button type="submit" className="rounded border px-2 py-0.5 text-xs">{st.replaceAll("_", " ")}</button>
                </form>
              ))}
            </div>
          )}
        </section>
      )}

      {os[0] && <p className="text-sm">OS: {os[0].folio} — {os[0].status.replaceAll("_", " ")}</p>}
      {canEdit && os.length === 0 && att.attentionType === "DIAGNOSTICO" && (
        <form action={createServiceOrderAction}>
          <input type="hidden" name="attendanceId" value={att.id} />
          <button type="submit" className="rounded-md border px-3 py-1 text-sm">Crear OS</button>
        </form>
      )}

      {canAssignExternalService(session) && att.attentionType !== "REPARACION" && (
        <section className="rounded-xl border border-dashed border-border p-4 text-sm">
          <h2 className="font-semibold">Servicio externo (SYSTRON)</h2>
          <ul className="mt-2 space-y-1">
            {externalCases.map((c) => (
              <li key={c.id}>
                Proveedor {c.supplierId.slice(0, 8)}… Salida: {c.outboundAt ? "sí" : "no"} Retorno:{" "}
                {c.inboundAt ? "sí" : "pendiente"}
                {!c.inboundAt && (
                  <form action={registerExternalServiceInboundAction} className="inline ml-2">
                    <input type="hidden" name="caseId" value={c.id} />
                    <input name="note" placeholder="Nota retorno" className="rounded border px-1 text-xs" />
                    <button type="submit" className="text-xs underline">Retorno</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <form action={registerExternalServiceOutboundAction} className="mt-2 flex flex-wrap gap-1">
            <input type="hidden" name="attendanceId" value={att.id} />
            <select name="supplierId" required className="rounded border px-2 py-1 text-xs">
              <option value="">Proveedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input name="note" placeholder="Motivo salida" className="rounded border px-2 py-1 text-xs" />
            <button type="submit" className="text-xs underline">Registrar salida a proveedor</button>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Bitácora técnica (inmutable)</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {logs.map((b) => (
            <li key={b.id} className="rounded border px-2 py-1">
              {b.body}
              <span className="block text-xs text-slate-500">{new Date(b.createdAt).toLocaleString("es-MX")}</span>
            </li>
          ))}
        </ul>
        {canEdit && (
          <form action={addTechnicalLogAction} className="mt-3 space-y-2">
            <input type="hidden" name="attendanceId" value={att.id} />
            {att.motId && <input type="hidden" name="motId" value={att.motId} />}
            <textarea name="body" required rows={2} className="w-full rounded border px-2 py-1 text-sm" placeholder="Nueva entrada" />
            <button type="submit" className="text-sm text-accent">Agregar</button>
          </form>
        )}
      </section>
    </div>
  );
}
