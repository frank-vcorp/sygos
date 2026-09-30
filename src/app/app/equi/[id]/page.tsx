import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { DetailGrid, DetailItem } from "@/components/patterns/detail-grid";
import { SectionCard } from "@/components/patterns/section-card";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/surface";
import { getSession } from "@/lib/session";
import { listEquiWarehouseEvents } from "@/lib/custody-events";
import { canViewEqui, getEquiDetail } from "../../activos/actions";

const WH_LABEL: Record<string, string> = {
  SIN_ENTRADA: "Sin entrada",
  EN_RESGUARDO: "En resguardo",
  SALIDA_PRUEBA: "Salida a prueba",
  SALIDA_DEFINITIVA: "Salida definitiva",
};

export default async function EquiDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewEqui(session)) redirect("/app");

  const { id } = await params;
  const equi = await getEquiDetail(session.activeCompany.id, id);
  if (!equi || !equi.active) notFound();
  const events = await listEquiWarehouseEvents(equi.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Activos"
        title={equi.folio}
        description="Identidad permanente del equipo — el serial de fabricante no sustituye al folio EQUI."
        breadcrumbs={[{ label: "Equipos", href: "/app/equi" }, { label: equi.folio }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={equi.warehouseStatus} />
            <Link href={`/app/clientes/${equi.clientId}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Cliente: {equi.clientName}
            </Link>
          </div>
        }
      />

      <DetailGrid title="Placa y almacén" description="Datos operativos del equipo en SYSTRON.">
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

      <p className="text-xs text-slate-500">
        <Link href="/app/tecnica" className="font-medium text-accent hover:underline">Operación técnica</Link>
        {" "}y cotizaciones se vinculan desde atenciones del cliente o del equipo según el flujo comercial.
      </p>
    </div>
  );
}
