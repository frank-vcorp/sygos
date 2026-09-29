import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canConfirmMotIngress, confirmMotIngressAction, getMot } from "../../activos/actions";
import { listTechnicalLogForMot } from "../../tecnica/actions";
import { addTechnicalLogAction } from "../../tecnica/actions";

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE_INGRESO_SERVOMOTORES: "Pendiente ingreso físico (Servomotores)",
  EN_RESGUARDO_SERVOMOTORES: "En resguardo (Servomotores)",
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
  const canIngress = canConfirmMotIngress(session) && mot.custodyStatus === "PENDIENTE_INGRESO_SERVOMOTORES";

  return (
    <div className="space-y-4">
      <Link href="/app/mot" className="text-sm text-accent hover:underline">
        ← MOT
      </Link>
      <h1 className="font-mono text-xl font-semibold">{mot.folio}</h1>
      {conflict === "1" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">Conflicto de versión; recarga e intenta de nuevo.</p>
      )}

      <dl className="grid gap-3 rounded-xl border border-border bg-card p-6 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-slate-500">Origen</dt>
          <dd>{mot.originCompanyCode === "SYSTRON" ? "SYSTRON" : "Servomotores"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Custodia</dt>
          <dd>{STATUS_LABEL[mot.custodyStatus] ?? mot.custodyStatus}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Modelo</dt>
          <dd>{mot.model}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Marca</dt>
          <dd>{mot.brand ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Serial</dt>
          <dd>{mot.manufacturerSerial ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Ingreso físico</dt>
          <dd>{mot.physicalIngressAt ? new Date(mot.physicalIngressAt).toLocaleString("es-MX") : "—"}</dd>
        </div>
        {mot.description && (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase text-slate-500">Descripción</dt>
            <dd>{mot.description}</dd>
          </div>
        )}
      </dl>

      {canIngress && (
        <form action={confirmMotIngressAction} className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Confirmar ingreso físico</h2>
          <p className="mt-1 text-sm text-slate-600">Inicia SLA y custodia en Servomotores (Gerente operativo).</p>
          <input type="hidden" name="id" value={mot.id} />
          <input type="hidden" name="version" value={mot.version} />
          <button type="submit" className="mt-3 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
            Confirmar ingreso
          </button>
        </form>
      )}

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Bitácora técnica</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {bitacora.length === 0 && <li className="text-slate-500">Sin entradas.</li>}
          {bitacora.map((b) => (
            <li key={b.id} className="rounded border border-border px-3 py-2">
              {b.body}
              <span className="block text-xs text-slate-500">{new Date(b.createdAt).toLocaleString("es-MX")}</span>
            </li>
          ))}
        </ul>
        {session.activeCompany.code === "SERVOMOTORES" && (
          <form action={addTechnicalLogAction} className="mt-3 space-y-2">
            <input type="hidden" name="motId" value={mot.id} />
            <textarea name="body" required rows={2} className="w-full rounded border px-2 py-1 text-sm" placeholder="Nueva entrada (inmutable)" />
            <button type="submit" className="text-sm text-accent">Agregar</button>
          </form>
        )}
        {session.activeCompany.code === "SYSTRON" && mot.originCompanyCode === "SYSTRON" && (
          <p className="mt-2 text-xs text-slate-500">Solo lectura desde SYSTRON.</p>
        )}
      </section>
    </div>
  );
}
