import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClipboardList, PackageCheck, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { DetailGrid, DetailItem } from "@/components/patterns/detail-grid";
import { SectionCard } from "@/components/patterns/section-card";
import { buttonVariants } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form-fields";
import { StatusBadge } from "@/components/ui/surface";
import { getSession } from "@/lib/session";
import {
  canConfirmMotIngress,
  confirmMotIngressAction,
  getMot,
  getMotCustodyHistory,
} from "../../activos/actions";
import { addTechnicalLogAction, listAttendancesForMot, listTechnicalLogForMot } from "../../tecnica/actions";
import { getDb } from "@/db/client";
import { diagnoses } from "@/db/schema";
import { eq } from "drizzle-orm";

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE_INGRESO_SERVOMOTORES: "Pendiente ingreso físico",
  EN_RESGUARDO_SERVOMOTORES: "En resguardo",
  SALIDA_PRUEBA: "Salida a prueba",
  EGRESADO: "Egresado",
};

export default async function MotDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ conflict?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const { conflict } = await searchParams;
  const mot = await getMot(id);
  if (!mot) notFound();
  const bitacora = await listTechnicalLogForMot(id);
  const custodyHistory = await getMotCustodyHistory(id);
  const motAttendances = await listAttendancesForMot(id);
  const db = getDb();
  const warrantyRows = await Promise.all(
    motAttendances
      .filter((a) => a.attentionType === "DIAGNOSTICO_GARANTIA")
      .map(async (a) => {
        const [d] = await db.select().from(diagnoses).where(eq(diagnoses.attendanceId, a.id)).limit(1);
        return d ? { attendanceId: a.id, outcome: d.warrantyOutcome, companyId: a.companyId } : null;
      }),
  );
  const canIngress = canConfirmMotIngress(session) && mot.custodyStatus === "PENDIENTE_INGRESO_SERVOMOTORES";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Activos"
        title={mot.folio}
        description="Identidad global MOT — el serial no sustituye al folio."
        breadcrumbs={[{ label: "Motores", href: "/app/mot" }, { label: mot.folio }]}
        actions={<StatusBadge status={mot.custodyStatus} />}
      />
      {conflict === "1" && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Conflicto de versión; recarga e intenta de nuevo.</p>
      )}

      <DetailGrid title="Identidad del motor" description="Custodia, origen y datos de placa.">
        <DetailItem label="Origen" value={mot.originCompanyCode === "SYSTRON" ? "SYSTRON" : "Servomotores"} />
        <DetailItem label="Custodia" value={STATUS_LABEL[mot.custodyStatus] ?? mot.custodyStatus} />
        <DetailItem label="Marca / modelo" value={`${mot.brand ?? "—"} · ${mot.model}`} />
        <DetailItem label="Serial fabricante" value={mot.manufacturerSerial ?? "—"} />
        <DetailItem
          label="Ingreso físico"
          value={mot.physicalIngressAt ? new Date(mot.physicalIngressAt).toLocaleString("es-MX") : "Pendiente"}
        />
        <DetailItem
          label="SLA (desde ingreso)"
          value={mot.slaDueAt ? new Date(mot.slaDueAt).toLocaleString("es-MX") : "—"}
        />
        {mot.egressAt && (
          <>
            <DetailItem label="Egreso" value={new Date(mot.egressAt).toLocaleString("es-MX")} />
            <DetailItem label="Recibe físicamente" value={mot.egressRecipient ?? "—"} />
            <DetailItem label="Documento habilitante" value={mot.egressDocumentRef ?? "—"} className="sm:col-span-2 lg:col-span-3" />
          </>
        )}
        {mot.description && (
          <DetailItem label="Descripción" value={mot.description} className="sm:col-span-2 lg:col-span-3" />
        )}
      </DetailGrid>

      {custodyHistory.length > 0 && (
        <SectionCard icon={ClipboardList} title="Historial de custodia" description="Movimientos de estado y responsables.">
          <ul className="space-y-2 text-sm">
            {custodyHistory.map((ev) => (
              <li key={ev.id} className="rounded-xl border border-border bg-slate-50/50 px-4 py-3">
                <span className="font-semibold">
                  {STATUS_LABEL[ev.fromStatus ?? ""] ?? ev.fromStatus ?? "—"} → {STATUS_LABEL[ev.toStatus] ?? ev.toStatus}
                </span>
                <span className="text-slate-500"> · {new Date(ev.createdAt).toLocaleString("es-MX")}</span>
                {ev.recipient && <p className="mt-1 text-slate-600">Recibe: {ev.recipient}</p>}
                {ev.documentRef && <p className="text-slate-600">Doc: {ev.documentRef}</p>}
                {ev.note && <p className="text-slate-600">{ev.note}</p>}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {session.activeCompany.code === "SYSTRON" && mot.originCompanyCode === "SYSTRON" && motAttendances.length > 0 && (
        <SectionCard title="Operación Servomotores" description="Vista de solo lectura desde SYSTRON." tone="muted">
          <ul className="space-y-2 text-sm">
            {motAttendances.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
                <span className="font-medium">{a.attentionType.replaceAll("_", " ")}</span>
                {warrantyRows.find((w) => w?.attendanceId === a.id)?.outcome === "PROCEDENTE" && (
                  <StatusBadge status="AUTORIZADA" className="!bg-success-muted" />
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {canIngress && (
        <SectionCard icon={PackageCheck} title="Confirmar ingreso físico" description="Inicia SLA y custodia en Servomotores." tone="accent">
          <form action={confirmMotIngressAction}>
            <input type="hidden" name="id" value={mot.id} />
            <input type="hidden" name="version" value={mot.version} />
            <button type="submit" className={buttonVariants({ variant: "primary" })}>Confirmar ingreso</button>
          </form>
        </SectionCard>
      )}

      <SectionCard icon={ScrollText} title="Bitácora técnica" description="Entradas inmutables del equipo.">
        <ul className="space-y-2 text-sm">
          {bitacora.length === 0 && <li className="text-slate-500">Sin entradas registradas.</li>}
          {bitacora.map((b) => (
            <li key={b.id} className="rounded-xl border border-border px-4 py-3">
              <p>{b.body}</p>
              <span className="mt-1 block text-xs text-slate-500">{new Date(b.createdAt).toLocaleString("es-MX")}</span>
            </li>
          ))}
        </ul>
        {session.activeCompany.code === "SERVOMOTORES" && (
          <form action={addTechnicalLogAction} className="mt-4 space-y-3 border-t border-border pt-4">
            <input type="hidden" name="motId" value={mot.id} />
            <Field label="Nueva entrada" hint="No se puede editar después de guardar">
              <Textarea name="body" required rows={3} placeholder="Avance, hallazgo o instrucción…" />
            </Field>
            <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Agregar a bitácora</button>
          </form>
        )}
        {session.activeCompany.code === "SYSTRON" && mot.originCompanyCode === "SYSTRON" && (
          <p className="mt-3 text-xs text-slate-500">Solo lectura desde SYSTRON.</p>
        )}
      </SectionCard>

      {session.activeCompany.code === "SERVOMOTORES" && motAttendances.length > 0 && (
        <p className="text-sm">
          <Link href="/app/tecnica" className="font-medium text-accent hover:underline">Ir a operación técnica</Link>
          {" "}para diagnósticos y reparaciones vinculados.
        </p>
      )}
    </div>
  );
}
