import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageSuppliers } from "@/lib/permissions";
import { createSupplierAction, listSuppliers } from "../maestros/actions";

export default async function ProveedoresPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const rows = await listSuppliers(session.activeCompany.id);
  const canCreate = canManageSuppliers(session.role);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Proveedores</h1>
      {canCreate && (
        <form action={createSupplierAction} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
          <input name="name" required placeholder="Nombre / razón social" className="rounded-md border border-border px-3 py-2 text-sm sm:col-span-2" />
          <input name="contactName" placeholder="Contacto" className="rounded-md border border-border px-3 py-2 text-sm" />
          <input name="phone" placeholder="Teléfono" className="rounded-md border border-border px-3 py-2 text-sm" />
          <input name="email" placeholder="Correo" className="rounded-md border border-border px-3 py-2 text-sm" />
          <input name="creditDays" type="number" min={0} placeholder="Días crédito" className="rounded-md border border-border px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white sm:col-span-2 sm:w-fit">
            Agregar proveedor
          </button>
        </form>
      )}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">{row.contactName ?? "—"}</td>
                <td className="px-4 py-3">{row.isIntercompany ? "Intercompañía" : "Normal"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  Sin proveedores.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Link href="/app" className="text-sm text-accent hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
