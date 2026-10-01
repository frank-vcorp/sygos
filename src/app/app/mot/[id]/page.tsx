import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClipboardList, FileText, PackageCheck, ScrollText, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { DetailGrid, DetailItem } from "@/components/patterns/detail-grid";
import { SectionCard } from "@/components/patterns/section-card";
import { WorkflowStrip } from "@/components/patterns/workflow-strip";
import { buttonVariants } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form-fields";
import { Card, StatusBadge } from "@/components/ui/surface";
import { canManageTechnicalState } from "@/lib/permissions-tecnica";
import { getSession } from "@/lib/session";
import {
  canConfirmMotIngress,
  canViewMot,
  confirmMotIngressAction,
  getMotCustodyHistory,
  getMotDetailEnriched,
  listQuotesForMot,
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

export const dynamic = "force-dynamic";

const ATT_LABEL: Record<string, string> = {
  DIAGNOSTICO: "Diagnóstico",
  REPARACION: "Reparación preautorizada",
  DIAGNOSTICO_GARANTIA: "Diagnóstico garantía",
};

export default async function MotDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ conflict?: string; ingress?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewMot(session)) redirect("/app");

  const { id } = await params;
  const { conflict, ingress } = await searchParams;
  const detail = await getMotDetailEnriched(id);
  if (!detail) notFound();
  const { mot, systronClient, smClient } = detail;

  const [bitacora, custodyHistory, motAttendances, quoteRows] = await Promise.all([
    listTechnicalLogForMot(id),
    getMotCustodyHistory(id),
    listAttendancesForMot(id),
    listQuotesForMot(id),
  ]);

  const db = getDb();
  const warrantyRows = await Promise.all(
    motAttendances
      .filter((a) => a.attentionType === "DIAGNOSTICO_GARANTIA")
      .map(async (a) => {
        const [d] = await db.select().from(diagnoses).where(eq(diagnoses.attendanceId, a.id)).limit(1);
        return d ? { attendanceId: a.id, outcome: d.warrantyOutcome, companyId: a.companyId } : null;
      }),
  );

  const hasIngress = mot.custodyStatus !== "PENDIENTE_INGRESO_SERVOMOTORES";
  const hasAttendance = motAttendances.length > 0;
  const hasQuote = quoteRows.length > 0;
  const quoteReady = quoteRows.some((r) => !r.quote.pendingPricing);
  const canIngress = canConfirmMotIngress(session) && mot.custodyStatus === "PENDIENTE_INGRESO_SERVOMOTORES";
  const canOpenTechnical = canManageTechnicalState(session, session.activeCompany.id);
  const smExecution =
    session.activeCompany.code === "SERVOMOTORES" && canOpenTechnical && hasIngress;
  const systronWarranty =
    session.activeCompany.code === "SYSTRON" &&
    mot.originCompanyCode === "SYSTRON" &&
    canOpenTechnical;
  const showNewAttendance = smExecution || systronWarranty;

  const workflowSteps = [
    {
      id: "alta",
      label: "Alta MOT",
      detail: mot.originCompanyCode === "SYSTRON" ? "Origen SYSTRON · cliente interco SM" : "Origen Servomotores",
      done: true,
      current: false,
    },
    {
      id: "ingress",
      label: "Ingreso físico (SM)",
      detail: hasIngress ? STATUS_LABEL[mot.custodyStatus] ?? mot.custodyStatus : "Pendiente en Servomotores",
      done: hasIngress,
      current: !hasIngress,
    },
    {
      id: "tech",
      label: "Atención técnica",
      detail: hasAttendance ? `${motAttendances.length} atención(es)` : "Ejecución en SM · garantía desde SYSTRON",
      done: hasAttendance,
      current: hasIngress && !hasAttendance,
    },
    {
      id: "quote",
      label: "Cotización",
      detail: hasQuote
        ? quoteReady
          ? "Precio definido"
          : "Pendiente de cotizar"
        : "Interco MOT al validar diagnóstico o reparación",
      done: quoteReady,
      current: hasQuote && quoteRows.some((r) => r.quote.pendingPricing),
    },
  ];

  const clientLink =
    session.activeCompany.code === "SYSTRON" && systronClient
      ? { href: `/app/clientes/${systronClient.id}`, label: systronClient.name }
      : session.activeCompany.code === "SERVOMOTORES" && smClient
        ? { href: `/app/clientes/${smClient.id}`, label: smClient.name }
        : systronClient
          ? { href: `/app/clientes/${systronClient.id}`, label: `SYSTRON: ${systronClient.name}` }
          : smClient
            ? { href: `/app/clientes/${smClient.id}`, label: smClient.name }
            : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Activos"
        title={mot.folio}
        description="Recorrido interco: custodia Servomotores → técnica → cotización(es) vinculadas."
        breadcrumbs={[{ label: "Motores", href: "/app/mot" }, { label: mot.folio }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={mot.custodyStatus} />
            {clientLink && (
              <Link href={clientLink.href} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Cliente: {clientLink.label}
              </Link>
            )}
            {mot.originCompanyCode === "SYSTRON" && systronClient && smClient && session.activeCompany.code === "SYSTRON" && (
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                Interco SM: {smClient.name}
              </span>
            )}
            {showNewAttendance && (
              <Link
                href={`/app/tecnica/nueva?motId=${mot.id}`}
                className={buttonVariants({ variant: "primary", size: "sm" })}
              >
                <Stethoscope className="size-4" />
                {systronWarranty && !smExecution ? "Nueva garantía" : "Nueva atención"}
              </Link>
            )}
          </div>
        }
      />
      {conflict === "1" && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Conflicto de versión; recarga e intenta de nuevo.
        </p>
      )}
      {ingress === "1" && mot.custodyStatus === "EN_RESGUARDO_SERVOMOTORES" && (
        <p className="rounded-xl bg-success-muted px-4 py-3 text-sm text-success">
          Ingreso confirmado — custodia en resguardo y SLA iniciado.
        </p>
      )}

      <Card className="p-4 sm:p-5">
        <WorkflowStrip steps={workflowSteps} />
      </Card>

      {canIngress && (
        <SectionCard
          icon={PackageCheck}
          title="Confirmar ingreso físico"
          description="Inicia SLA y custodia en Servomotores."
          tone="accent"
        >
          <form action={confirmMotIngressAction}>
            <input type="hidden" name="id" value={mot.id} />
            <input type="hidden" name="version" value={mot.version} />
            <button type="submit" className={buttonVariants({ variant: "primary" })}>
              Confirmar ingreso
            </button>
          </form>
        </SectionCard>
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
        {systronClient && (
          <DetailItem
            label="Cliente SYSTRON"
            value={
              <Link href={`/app/clientes/${systronClient.id}`} className="text-accent hover:underline">
                {systronClient.name}
              </Link>
            }
          />
        )}
        {smClient && (
          <DetailItem
            label="Cliente Servomotores"
            value={
              <Link href={`/app/clientes/${smClient.id}`} className="text-accent hover:underline">
                {smClient.name}
              </Link>
            }
          />
        )}
        {mot.egressAt && (
          <>
            <DetailItem label="Egreso" value={new Date(mot.egressAt).toLocaleString("es-MX")} />
            <DetailItem label="Recibe físicamente" value={mot.egressRecipient ?? "—"} />
            <DetailItem
              label="Documento habilitante"
              value={mot.egressDocumentRef ?? "—"}
              className="sm:col-span-2 lg:col-span-3"
            />
          </>
        )}
        {mot.description && (
          <DetailItem label="Descripción" value={mot.description} className="sm:col-span-2 lg:col-span-3" />
        )}
      </DetailGrid>

      <SectionCard
        icon={Stethoscope}
        title="Atenciones técnicas"
        description={
          session.activeCompany.code === "SYSTRON" && mot.originCompanyCode === "SYSTRON"
            ? "Garantía en SYSTRON; diagnóstico/reparación en Servomotores (vista según empresa activa)."
            : "Diagnóstico, reparación o garantía vinculadas a este folio."
        }
        tone={motAttendances.length ? "default" : "muted"}
      >
        {motAttendances.length === 0 ? (
          <p className="text-sm text-slate-500">
            {hasIngress
              ? "Aún no hay atenciones. Usa «Nueva atención» cuando corresponda."
              : "Confirma el ingreso físico en Servomotores antes de abrir técnica en SM."}
          </p>
        ) : (
          <ul className="divide-y rounded-xl border border-border">
            {motAttendances.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{ATT_LABEL[a.attentionType] ?? a.attentionType}</span>
                  {warrantyRows.find((w) => w?.attendanceId === a.id)?.outcome === "PROCEDENTE" && (
                    <StatusBadge status="AUTORIZADA" className="!bg-success-muted" />
                  )}
                  <span className="text-slate-500"> · {a.reportedFault ?? "Sin falla reportada"}</span>
                </span>
                <Link href={`/app/tecnica/${a.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Abrir atención
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        icon={FileText}
        title="Cotizaciones"
        description="Incluye pares intercompañía MOT (SYSTRON ↔ Servomotores) al cotizar diagnóstico validado."
        tone={quoteRows.length ? "default" : "muted"}
      >
        {quoteRows.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aparecerán aquí cuando la atención genere pendiente de cotizar o vínculo MOT interco.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border border-border">
            {quoteRows.map(({ quote: q }) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-accent">{q.folio}</span>
                  <StatusBadge status={q.status} />
                  {q.pendingPricing && <span className="text-xs text-amber-700">Sin precio CEO</span>}
                  {q.linkedQuoteId && (
                    <span className="text-xs text-slate-500">Interco vinculada</span>
                  )}
                </span>
                <Link href={`/app/cotizaciones/${q.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Abrir cotización
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {custodyHistory.length > 0 && (
        <SectionCard icon={ClipboardList} title="Historial de custodia" description="Movimientos de estado y responsables.">
          <ul className="space-y-2 text-sm">
            {custodyHistory.map((ev) => (
              <li key={ev.id} className="rounded-xl border border-border bg-slate-50/50 px-4 py-3">
                <span className="font-semibold">
                  {(ev.fromStatus === "PENDIENTE_INGRESO_SERVOMOTORES"
                    ? "Pendiente ingreso"
                    : STATUS_LABEL[ev.fromStatus ?? ""] ?? ev.fromStatus ?? "—")}{" "}
                  → {STATUS_LABEL[ev.toStatus] ?? ev.toStatus}
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
            <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Agregar a bitácora
            </button>
          </form>
        )}
        {session.activeCompany.code === "SYSTRON" && mot.originCompanyCode === "SYSTRON" && (
          <p className="mt-3 text-xs text-slate-500">Bitácora operativa: solo escritura en Servomotores.</p>
        )}
      </SectionCard>
    </div>
  );
}
