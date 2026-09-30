import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { getSession } from "@/lib/session";
import { listEquiWarehouseEvents } from "@/lib/custody-events";
import { canViewEqui, getEqui } from "../../activos/actions";

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
  const equi = await getEqui(session.activeCompany.id, id);
  if (!equi || !equi.active) notFound();
  const events = await listEquiWarehouseEvents(equi.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Activos"
        title={equi.folio}
        description="Identidad permanente del equipo (folio EQUI). El serial de fabricante no sustituye al folio."
        breadcrumbs={[{ label: "Equipos", href: "/app/equi" }, { label: equi.folio }]}
      />
      <Card className="grid gap-3 p-6 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-slate-500">Almacén</dt>
          <dd>{WH_LABEL[equi.warehouseStatus] ?? equi.warehouseStatus}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Modelo</dt>
          <dd>{equi.model}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Marca</dt>
          <dd>{equi.brand ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Tipo</dt>
          <dd>{equi.equipmentType ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Serial fabricante</dt>
          <dd>{equi.manufacturerSerial ?? "—"}</dd>
        </div>
        {equi.description && (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase text-slate-500">Descripción</dt>
            <dd>{equi.description}</dd>
          </div>
        )}
      </Card>
      {events.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Historial almacén</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {events.map((ev) => (
              <li key={ev.id} className="rounded border border-border px-3 py-2">
                <span className="font-medium">
                  {ev.fromStatus ? `${WH_LABEL[ev.fromStatus] ?? ev.fromStatus} → ` : ""}
                  {WH_LABEL[ev.toStatus] ?? ev.toStatus}
                </span>
                <span className="text-slate-500"> · {new Date(ev.createdAt).toLocaleString("es-MX")}</span>
                {ev.note && <p className="text-slate-600">{ev.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
