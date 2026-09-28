import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageSuppliers } from "@/lib/permissions";
import {
  cancelSupplierAction,
  getEntityHistory,
  getSupplier,
  updateSupplierAction,
} from "../../maestros/actions";

export default async function ProveedorDetallePage({
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
  const supplier = await getSupplier(session.activeCompany.id, id);
  if (!supplier || !supplier.active) notFound();

  const history = await getEntityHistory("SUPPLIER", supplier.id);
  const canEdit = canManageSuppliers(session.role) && !supplier.isIntercompany;

  return (
    <div className="space-y-4">
      <Link href="/app/proveedores" className="text-sm text-accent hover:underline">
        ← Proveedores
      </Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-semibold">{supplier.name}</h1>
        {supplier.folio && <span className="font-mono text-sm text-slate-500">{supplier.folio}</span>}
      </div>
      {conflict === "1" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          El registro cambió en otra sesión. Recarga antes de guardar.
        </p>
      )}

      {canEdit && (
        <section className="rounded-xl border border-border bg-card p-6">
          <form action={updateSupplierAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={supplier.id} />
            <input type="hidden" name="version" value={supplier.version} />
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium">Nombre</span>
              <input name="name" defaultValue={supplier.name} required className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Contacto</span>
              <input name="contactName" defaultValue={supplier.contactName ?? ""} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Teléfono</span>
              <input name="phone" defaultValue={supplier.phone ?? ""} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium">Correo</span>
              <input name="email" type="email" defaultValue={supplier.email ?? ""} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
            </label>
            <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white sm:w-fit">
              Guardar
            </button>
          </form>
          <form action={cancelSupplierAction} className="mt-6 border-t border-border pt-4">
            <input type="hidden" name="id" value={supplier.id} />
            <input type="hidden" name="version" value={supplier.version} />
            <input name="reason" required minLength={3} placeholder="Motivo de baja" className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm" />
            <button type="submit" className="mt-2 rounded-md border border-danger px-3 py-2 text-sm text-danger">
              Dar de baja proveedor
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
