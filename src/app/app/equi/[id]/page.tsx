import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClipboardList, Package, Stethoscope, FileText, Warehouse } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { DetailGrid, DetailItem } from "@/components/patterns/detail-grid";
import { SectionCard } from "@/components/patterns/section-card";
import { WorkflowStrip } from "@/components/patterns/workflow-strip";
import { buttonVariants } from "@/components/ui/button";
import { Card, StatusBadge } from "@/components/ui/surface";
import { getSession } from "@/lib/session";
import { listEquiWarehouseEvents } from "@/lib/custody-events";
import { registerEquiEntryAction } from "../../almacen/actions";
import {
  canViewEqui,
  getEquiDetail,
  listAttendancesForEqui,
  listQuotesForEqui,
} from "../../activos/actions";

export const dynamic = "force-dynamic";

const WH_LABEL: Record<string, string> = {
  SIN_ENTRADA: "Sin entrada",
  EN_RESGUARDO: "En resguardo",
  SALIDA_PRUEBA: "Salida a prueba",
  SALIDA_DEFINITIVA: "Salida definitiva",
};

const ATT_LABEL: Record<string, string> = {
  DIAGNOSTICO: "Diagnóstico",
  REPARACION: "Reparación preautorizada",
  DIAGNOSTICO_GARANTIA: "Diagnóstico garantía",
};

function canRegisterEquiEntry(role: string) {
  return (
    role === "ADMINISTRADOR" ||
    role === "CEO" ||
    role === "ALMACEN_SYSTRON" ||
    role === "GERENTE_OPERATIVO_SYSTRON"
  );
}

export default async function EquiDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ entry?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewEqui(session)) redirect("/app");

  const { id } = await params;
  const { entry } = await searchParams;
  const equi = await getEquiDetail(session.activeCompany.id, id);
  if (!equi || !equi.active) notFound();

  const [events, attendances, quoteRows] = await Promise.all([
    listEquiWarehouseEvents(equi.id),
    listAttendancesForEqui(equi.id, session.activeCompany.id),
    listQuotesForEqui(equi.id, session.activeCompany.id),
  ]);

  const hasIngress = equi.warehouseStatus !== "SIN_ENTRADA";
  const hasAttendance = attendances.length > 0;
  const hasQuote = quoteRows.length > 0;
  const quoteReady = quoteRows.some((r) => !r.quote.pendingPricing);

  const workflowSteps = [
    {
      id: "alta",
      label: "Alta EQUI",
      detail: "Folio permanente asignado",
      done: true,
      current: false,
    },
    {
      id: "ingress",
      label: "Entrada física",
      detail: hasIngress ? WH_LABEL[equi.warehouseStatus] : "Pendiente en Almacén",
      done: hasIngress,
      current: equi.warehouseStatus === "SIN_ENTRADA",
    },
    {
      id: "tech",
      label: "Atención técnica",
      detail: hasAttendance ? `${attendances.length} atención(es)` : "Requiere ingreso previo",
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
        : "Tras validar diagnóstico o reparación",
      done: quoteReady,
      current: hasQuote && quoteRows.some((r) => r.quote.pendingPricing),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Activos"
        title={equi.folio}
        description="Recorrido SYSTRON: custodia → técnica → cotización comercial."
        breadcrumbs={[{ label: "Equipos", href: "/app/equi" }, { label: equi.folio }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={equi.warehouseStatus} />
            <Link href={`/app/clientes/${equi.clientId}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Cliente: {equi.clientName}
            </Link>
            {hasIngress && (
              <Link
                href={`/app/tecnica/nueva?equiId=${equi.id}`}
                className={buttonVariants({ variant: "primary", size: "sm" })}
              >
                <Stethoscope className="size-4" />
                Nueva atención
              </Link>
            )}
            <Link href="/app/almacen" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <Warehouse className="size-4" />
              Almacén
            </Link>
          </div>
        }
      />

      <Card className="p-4 sm:p-5">
        <WorkflowStrip steps={workflowSteps} />
      </Card>

      {entry === "1" && equi.warehouseStatus === "EN_RESGUARDO" && (
        <p className="rounded-xl bg-success-muted px-4 py-3 text-sm text-success">
          Entrada registrada — el equipo está en resguardo en almacén.
        </p>
      )}

      {equi.warehouseStatus === "SIN_ENTRADA" && canRegisterEquiEntry(session.role) && (
        <SectionCard
          icon={Warehouse}
          title="Registrar entrada física"
          description="El SLA de diagnóstico inicia con el ingreso a resguardo (Discovery §13.2)."
          tone="accent"
        >
          <form action={registerEquiEntryAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="equiId" value={equi.id} />
            <input type="hidden" name="version" value={equi.version} />
            <button type="submit" className={buttonVariants({ variant: "primary" })}>
              Confirmar entrada a resguardo
            </button>
            <span className="text-xs text-slate-500">También disponible en Almacén SYSTRON.</span>
          </form>
        </SectionCard>
      )}

      <DetailGrid title="Placa y almacén" description="Identidad del equipo en SYSTRON.">
        <DetailItem label="Estado almacén" value={WH_LABEL[equi.warehouseStatus] ?? equi.warehouseStatus} />
        <DetailItem label="Modelo" value={equi.model} />
        <DetailItem label="Marca" value={equi.brand ?? "—"} />
        <DetailItem label="Tipo" value={equi.equipmentType ?? "—"} />
        <DetailItem label="Serial fabricante" value={equi.manufacturerSerial ?? "—"} />
        <DetailItem
          label="Cliente"
          value={
            <Link href={`/app/clientes/${equi.clientId}`} className="text-accent hover:underline">
              {equi.clientName}
            </Link>
          }
        />
        {equi.description && (
          <DetailItem label="Descripción" value={equi.description} className="sm:col-span-2 lg:col-span-3" />
        )}
      </DetailGrid>

      <SectionCard
        icon={Stethoscope}
        title="Atenciones técnicas"
        description="Diagnóstico, reparación o garantía vinculadas a este folio."
        tone={attendances.length ? "default" : "muted"}
      >
        {attendances.length === 0 ? (
          <p className="text-sm text-slate-500">
            {hasIngress
              ? "Aún no hay atenciones. Usa «Nueva atención» para abrir el flujo técnico."
              : "Registra la entrada física antes de crear una atención."}
          </p>
        ) : (
          <ul className="divide-y rounded-xl border border-border">
            {attendances.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <span className="font-semibold">{ATT_LABEL[a.attentionType] ?? a.attentionType}</span>
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
        description="Generadas al validar diagnóstico o al cerrar reparación pendiente de precio."
        tone={quoteRows.length ? "default" : "muted"}
      >
        {quoteRows.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aparecerán aquí cuando la atención técnica genere un pendiente de cotizar.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border border-border">
            {quoteRows.map(({ quote: q }) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-accent">{q.folio}</span>
                  <StatusBadge status={q.status} />
                  {q.pendingPricing && (
                    <span className="text-xs text-amber-700">Sin precio CEO</span>
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

      <SectionCard
        icon={ClipboardList}
        title="Historial de almacén"
        description="Movimientos de entrada, resguardo y salidas."
        tone={events.length ? "default" : "muted"}
      >
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay movimientos registrados para este folio.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {events.map((ev) => (
              <li key={ev.id} className="rounded-xl border border-border bg-slate-50/50 px-4 py-3">
                <span className="font-semibold">
                  {ev.fromStatus ? `${WH_LABEL[ev.fromStatus] ?? ev.fromStatus} → ` : ""}
                  {WH_LABEL[ev.toStatus] ?? ev.toStatus}
                </span>
                <span className="text-slate-500"> · {new Date(ev.createdAt).toLocaleString("es-MX")}</span>
                {ev.note && <p className="mt-1 text-slate-600">{ev.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <p className="flex items-center gap-1 text-xs text-slate-500">
        <Package className="size-3.5" />
        El serial de fabricante no sustituye al folio EQUI.
      </p>
    </div>
  );
}
