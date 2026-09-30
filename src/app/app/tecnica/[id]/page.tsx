import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Activity, FileWarning, ScrollText, Stethoscope, Wrench } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { DetailGrid, DetailItem } from "@/components/patterns/detail-grid";
import { SectionCard } from "@/components/patterns/section-card";
import { WorkflowStrip } from "@/components/patterns/workflow-strip";
import { buttonVariants } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { StatusBadge } from "@/components/ui/surface";
import { formatMxnDisplay } from "@/lib/format-currency";
import { getSession } from "@/lib/session";
import { canAssignExternalService, canManageTechnicalState, canReturnDiagnosis, canValidateDiagnosis } from "@/lib/permissions-tecnica";
import { getEqui } from "../../activos/actions";
import { getQuoteForAttendance } from "../../cotizaciones/actions";
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
  PENDIENTE_VALIDACION_GERENTE: "Pendiente validación",
  DEVUELTO_CORRECCION: "Devuelto a corrección",
  VALIDADO_GERENTE: "Validado por gerente",
};

const DIAG_ORDER = ["ABIERTO", "EN_TRABAJO", "TERMINADO", "PENDIENTE_VALIDACION_GERENTE", "VALIDADO_GERENTE"] as const;

export default async function AtencionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const detail = await getAttendanceDetail(id, session.activeCompany.id);
  if (!detail) notFound();
  const { att, diag, repair, os, corrections, externalCases, production, logs } = detail;
  const [equiAsset, linkedQuote] = await Promise.all([
    att.equiId ? getEqui(session.activeCompany.id, att.equiId) : Promise.resolve(null),
    getQuoteForAttendance(att.id, session.activeCompany.id),
  ]);
  const canEdit = canManageTechnicalState(session, att.companyId);
  const suppliers =
    session.activeCompany.code === "SYSTRON" ? await listSuppliers(session.activeCompany.id) : [];

  const diagStatusKey = diag?.status === "DEVUELTO_CORRECCION" ? "EN_TRABAJO" : diag?.status;
  const diagCurrentIdx = diag ? DIAG_ORDER.indexOf(diagStatusKey as typeof DIAG_ORDER[number]) : -1;
  const diagSteps = diag
    ? DIAG_ORDER.map((st, i) => ({
        id: st,
        label: DIAG_STATUS[st] ?? st,
        done: diag.status === "VALIDADO_GERENTE" ? true : i < diagCurrentIdx,
        current: i === diagCurrentIdx,
      }))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operación"
        title={att.attentionType.replaceAll("_", " ")}
        description={att.reportedFault ?? "Atención técnica en curso"}
        breadcrumbs={[{ label: "Técnica", href: "/app/tecnica" }, { label: "Detalle" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            {diag && <StatusBadge status={diag.status} />}
            {att.equiId && equiAsset && (
              <Link href={`/app/equi/${att.equiId}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                EQUI {equiAsset.folio}
              </Link>
            )}
            {att.motId && (
              <Link href={`/app/mot/${att.motId}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Ver MOT
              </Link>
            )}
            {linkedQuote && (
              <Link
                href={`/app/cotizaciones/${linkedQuote.id}`}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Cotización {linkedQuote.folio}
              </Link>
            )}
          </div>
        }
      />

      <DetailGrid title="Contexto de atención">
        <DetailItem label="Tipo" value={att.attentionType.replaceAll("_", " ")} />
        <DetailItem label="Falla reportada" value={att.reportedFault ?? "—"} className="sm:col-span-2" />
        {equiAsset && (
          <DetailItem
            label="Equipo EQUI"
            value={
              <Link href={`/app/equi/${equiAsset.id}`} className="font-mono text-accent hover:underline">
                {equiAsset.folio}
              </Link>
            }
          />
        )}
        {os[0] && (
          <DetailItem label="Orden de servicio" value={`${os[0].folio} · ${os[0].status.replaceAll("_", " ")}`} />
        )}
        {linkedQuote && (
          <DetailItem
            label="Cotización"
            value={
              <Link href={`/app/cotizaciones/${linkedQuote.id}`} className="font-mono text-accent hover:underline">
                {linkedQuote.folio}
                {linkedQuote.pendingPricing ? " · pendiente precio" : ""}
              </Link>
            }
          />
        )}
      </DetailGrid>

      {diag && (
        <>
          <SectionCard icon={Stethoscope} title="Diagnóstico" description="Flujo de validación gerencial." tone="accent">
            {diagSteps.length > 0 && (
              <div className="mb-5">
                <WorkflowStrip steps={diagSteps} />
              </div>
            )}
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Prioridad</dt>
                <dd className="font-medium">{diag.priority}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Snapshot precio</dt>
                <dd className="font-medium">{formatMxnDisplay(diag.snapshotPriceMxn)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">SLA</dt>
                <dd className="font-medium">{diag.snapshotSlaDays} días hábiles</dd>
              </div>
            </dl>
            {diag.warrantyValidUntil && (
              <p className="mt-3 text-sm text-slate-600">
                Vigencia garantía hasta {new Date(diag.warrantyValidUntil).toLocaleDateString("es-MX")}
              </p>
            )}
            {diag.warrantyOutcome && diag.warrantyOutcome !== "PENDIENTE" && (
              <p className="mt-2 text-sm">Garantía: <StatusBadge status={diag.warrantyOutcome} /></p>
            )}
            {production && <p className="mt-2 text-xs text-slate-500">Producción atribuida al cierre validado.</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              {canEdit && diag.status === "ABIERTO" && (
                <form action={advanceDiagnosisStatusAction}>
                  <input type="hidden" name="diagnosisId" value={diag.id} />
                  <input type="hidden" name="target" value="EN_TRABAJO" />
                  <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Iniciar diagnóstico</button>
                </form>
              )}
              {canEdit && (diag.status === "EN_TRABAJO" || diag.status === "DEVUELTO_CORRECCION") && (
                <form action={advanceDiagnosisStatusAction}>
                  <input type="hidden" name="diagnosisId" value={diag.id} />
                  <input type="hidden" name="target" value="TERMINADO" />
                  <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Marcar terminado</button>
                </form>
              )}
              {canValidateDiagnosis(session) && diag.status === "PENDIENTE_VALIDACION_GERENTE" && (
                <form action={validateDiagnosisAction}>
                  <input type="hidden" name="diagnosisId" value={diag.id} />
                  <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Validar gerente</button>
                </form>
              )}
            </div>

            {canReturnDiagnosis(session) && diag.status === "PENDIENTE_VALIDACION_GERENTE" && (
              <form action={returnDiagnosisAction} className="mt-4 space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-4">
                <p className="text-xs font-semibold text-red-900">Devolver a corrección</p>
                <input type="hidden" name="diagnosisId" value={diag.id} />
                <Field label="Motivo">
                  <Input name="reason" required />
                </Field>
                <Field label="Instrucción al técnico">
                  <Input name="instruction" required />
                </Field>
                <button type="submit" className={buttonVariants({ variant: "danger", size: "sm" })}>Devolver</button>
              </form>
            )}

            {canValidateDiagnosis(session) &&
              att.attentionType === "DIAGNOSTICO_GARANTIA" &&
              diag.status === "VALIDADO_GERENTE" &&
              diag.warrantyOutcome === "PENDIENTE" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={resolveWarrantyAction}>
                    <input type="hidden" name="diagnosisId" value={diag.id} />
                    <input type="hidden" name="outcome" value="PROCEDENTE" />
                    <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Garantía procedente</button>
                  </form>
                  <form action={resolveWarrantyAction}>
                    <input type="hidden" name="diagnosisId" value={diag.id} />
                    <input type="hidden" name="outcome" value="NO_PROCEDENTE" />
                    <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>No procedente</button>
                  </form>
                </div>
              )}
            {diag.warrantyOutcome === "NO_PROCEDENTE" && (session.role === "CEO" || session.role === "ADMINISTRADOR") && (
              <form action={ceoOverrideWarrantyAction} className="mt-3">
                <input type="hidden" name="diagnosisId" value={diag.id} />
                <button type="submit" className={buttonVariants({ variant: "ghost", size: "sm" })}>CEO: convertir a garantía válida</button>
              </form>
            )}
            {corrections.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-border pt-4 text-xs text-slate-600">
                {corrections.map((c) => (
                  <li key={c.id}>
                    <span className="font-medium">{new Date(c.createdAt).toLocaleString("es-MX")}</span>: {c.reason} — {c.instruction}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      )}

      {repair && (
        <SectionCard icon={Wrench} title="Reparación preautorizada" description="Actualiza estado operativo del taller.">
          <p className="text-sm text-slate-600">
            Prioridad {repair.priority} · +{repair.snapshotIncrementPercent}% · SLA {repair.snapshotSlaDays}d ·{" "}
            <StatusBadge status={repair.status} />
          </p>
          {canEdit && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(["EN_REPARACION", "EN_ESPERA_REFACCIONES", "REPARACION_TERMINADA", "SIN_REPARACION"] as const).map((st) => (
                <form key={st} action={updateRepairStatusAction}>
                  <input type="hidden" name="repairId" value={repair.id} />
                  <input type="hidden" name="status" value={st} />
                  <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    {st.replaceAll("_", " ")}
                  </button>
                </form>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {canEdit && os.length === 0 && att.attentionType === "DIAGNOSTICO" && (
        <SectionCard icon={Activity} title="Orden de servicio" description="Crea la OS cuando el diagnóstico lo amerite.">
          <form action={createServiceOrderAction}>
            <input type="hidden" name="attendanceId" value={att.id} />
            <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Crear OS</button>
          </form>
        </SectionCard>
      )}

      {canAssignExternalService(session) && att.attentionType !== "REPARACION" && (
        <SectionCard icon={FileWarning} title="Servicio externo" description="Salida y retorno con proveedor SYSTRON." tone="muted">
          <ul className="mb-4 space-y-2 text-sm">
            {externalCases.map((c) => (
              <li key={c.id} className="rounded-lg border border-border px-3 py-2">
                Proveedor {c.supplierId.slice(0, 8)}… · Salida: {c.outboundAt ? "sí" : "no"} · Retorno: {c.inboundAt ? "sí" : "pendiente"}
                {!c.inboundAt && (
                  <form action={registerExternalServiceInboundAction} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="caseId" value={c.id} />
                    <Input name="note" placeholder="Nota de retorno" className="!mt-0 h-8 max-w-xs text-xs" />
                    <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Registrar retorno</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <form action={registerExternalServiceOutboundAction} className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="attendanceId" value={att.id} />
            <Field label="Proveedor">
              <Select name="supplierId" required>
                <option value="">Seleccionar</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Motivo salida">
              <Input name="note" required placeholder="Referencia" />
            </Field>
            <div className="flex items-end">
              <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Registrar salida</button>
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard icon={ScrollText} title="Bitácora técnica" description="Registro inmutable de la atención.">
        <ul className="space-y-2 text-sm">
          {logs.length === 0 && <li className="text-slate-500">Sin entradas.</li>}
          {logs.map((b) => (
            <li key={b.id} className="rounded-xl border border-border px-4 py-3">
              <p>{b.body}</p>
              <span className="mt-1 block text-xs text-slate-500">{new Date(b.createdAt).toLocaleString("es-MX")}</span>
            </li>
          ))}
        </ul>
        {canEdit && (
          <form action={addTechnicalLogAction} className="mt-4 space-y-3 border-t border-border pt-4">
            <input type="hidden" name="attendanceId" value={att.id} />
            {att.motId && <input type="hidden" name="motId" value={att.motId} />}
            <Field label="Nueva entrada">
              <Textarea name="body" required rows={3} placeholder="Avance técnico…" />
            </Field>
            <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Agregar</button>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
