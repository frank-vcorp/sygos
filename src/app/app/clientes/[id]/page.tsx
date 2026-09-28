import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageClients } from "@/lib/permissions";
import {
  cancelClientAction,
  getClient,
  getClientContacts,
  getEntityHistory,
  updateClientAction,
} from "../../maestros/actions";

export default async function ClienteDetallePage({
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
  const client = await getClient(session.activeCompany.id, id);
  if (!client || !client.active) notFound();

  const contacts = await getClientContacts(client.id);
  const history = await getEntityHistory("CLIENT", client.id);
  const canEdit = canManageClients(session.role, session.activeCompany.code) && !client.isIntercompany;

  return (
    <div className="space-y-4">
      <Link href="/app/clientes" className="text-sm text-accent hover:underline">
        ← Clientes
      </Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-semibold">{client.name}</h1>
        {client.folio && <span className="font-mono text-sm text-slate-500">{client.folio}</span>}
      </div>

      {conflict === "1" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          El registro cambió en otra sesión. Datos recargados; revisa antes de guardar.
        </p>
      )}

      <dl className="grid gap-3 rounded-xl border border-border bg-card p-6 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-slate-500">Crédito</dt>
          <dd>{client.creditDays} días</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Requiere factura</dt>
          <dd>{client.requiresInvoice ? "Sí" : "No"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Versión</dt>
          <dd>{client.version}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Intercompañía</dt>
          <dd>{client.isIntercompany ? "Sí" : "No"}</dd>
        </div>
      </dl>

      {canEdit && (
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Editar</h2>
          <form action={updateClientAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={client.id} />
            <input type="hidden" name="version" value={client.version} />
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium">Nombre</span>
              <input
                name="name"
                defaultValue={client.name}
                required
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Crédito (días)</span>
              <input
                name="creditDays"
                type="number"
                min={0}
                defaultValue={client.creditDays}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input name="requiresInvoice" type="checkbox" defaultChecked={client.requiresInvoice} />
              Requiere factura
            </label>
            <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white sm:w-fit">
              Guardar cambios
            </button>
          </form>

          <form action={cancelClientAction} className="mt-6 border-t border-border pt-4">
            <input type="hidden" name="id" value={client.id} />
            <input type="hidden" name="version" value={client.version} />
            <h3 className="text-sm font-semibold text-danger">Baja lógica</h3>
            <input
              name="reason"
              required
              minLength={3}
              placeholder="Motivo de baja"
              className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="mt-2 rounded-md border border-danger px-3 py-2 text-sm text-danger hover:bg-red-50"
            >
              Dar de baja cliente
            </button>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Contactos</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {contacts.length === 0 && <li className="text-slate-500">Sin contactos registrados.</li>}
          {contacts.map((c) => (
            <li key={c.id} className="rounded-md border border-border px-3 py-2">
              <span className="font-medium">{c.name}</span>
              {c.isPrimary && <span className="ml-2 text-xs text-accent">Principal</span>}
              <p className="text-slate-600">
                {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {history.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Historial</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="rounded-md border border-border px-3 py-2">
                <span className="font-medium">{h.eventType === "CANCELLED" ? "Baja" : "Actualización"}</span>
                <span className="text-slate-500"> · {h.actorName}</span>
                <span className="text-slate-500"> · {new Date(h.createdAt).toLocaleString("es-MX")}</span>
                {h.reason && <p className="text-slate-600">{h.reason}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
