import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageProspects } from "@/lib/permissions";
import {
  cancelProspectAction,
  getEntityHistory,
  getProspect,
  updateProspectAction,
} from "../../maestros/actions";

export default async function ProspectoDetallePage({
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
  const prospect = await getProspect(session.activeCompany.id, id);
  if (!prospect || !prospect.active) notFound();

  const history = await getEntityHistory("PROSPECT", prospect.id);
  const canEdit = canManageProspects(session.role, session.activeCompany.code);

  return (
    <div className="space-y-4">
      <Link href="/app/prospectos" className="text-sm text-accent hover:underline">
        ← Prospectos
      </Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-semibold">{prospect.name}</h1>
        {prospect.folio && <span className="font-mono text-sm text-slate-500">{prospect.folio}</span>}
      </div>
      {conflict === "1" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          El registro cambió en otra sesión. Recarga antes de guardar.
        </p>
      )}

      {canEdit && (
        <section className="rounded-xl border border-border bg-card p-6">
          <form action={updateProspectAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={prospect.id} />
            <input type="hidden" name="version" value={prospect.version} />
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium">Nombre</span>
              <input name="name" defaultValue={prospect.name} required className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Fuente</span>
              <input name="source" defaultValue={prospect.source ?? ""} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Nota</span>
              <input name="note" defaultValue={prospect.note ?? ""} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
            </label>
            <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white sm:col-span-2 sm:w-fit">
              Guardar
            </button>
          </form>
          <form action={cancelProspectAction} className="mt-6 border-t border-border pt-4">
            <input type="hidden" name="id" value={prospect.id} />
            <input type="hidden" name="version" value={prospect.version} />
            <input name="reason" required minLength={3} placeholder="Motivo de baja" className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm" />
            <button type="submit" className="mt-2 rounded-md border border-danger px-3 py-2 text-sm text-danger">
              Dar de baja prospecto
            </button>
          </form>
        </section>
      )}

      {history.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-6 text-sm">
          <h2 className="font-semibold">Historial</h2>
          <ul className="mt-2 space-y-2">
            {history.map((h) => (
              <li key={h.id}>
                {h.eventType} · {h.actorName} · {new Date(h.createdAt).toLocaleString("es-MX")}
                {h.reason && ` — ${h.reason}`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
