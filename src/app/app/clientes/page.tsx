import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageClients } from "@/lib/permissions";
import { listClients } from "../maestros/actions";

export default async function ClientesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await listClients(session.activeCompany.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Clientes</h1>
        {canManageClients(session.role, session.activeCompany.code) && (
          <Link
            href="/app/clientes/nuevo"
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"
          >
            Nuevo cliente
          </Link>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Crédito (días)</th>
              <th className="px-4 py-3">Factura</th>
              <th className="px-4 py-3">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Sin clientes en {session.activeCompany.displayName}.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/app/clientes/${row.id}`} className="font-medium text-accent hover:underline">
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.creditDays}</td>
                <td className="px-4 py-3">{row.requiresInvoice ? "Sí" : "No"}</td>
                <td className="px-4 py-3">{row.isIntercompany ? "Intercompañía" : "Normal"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
