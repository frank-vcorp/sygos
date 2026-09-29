import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canCreateEqui, canViewEqui, listEquiForCompany } from "../activos/actions";

export default async function EquiPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewEqui(session)) redirect("/app");

  const rows = await listEquiForCompany(session.activeCompany.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Equipos (EQUI)</h1>
        {canCreateEqui(session) && (
          <Link href="/app/equi/nuevo" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white">
            Nuevo EQUI
          </Link>
        )}
      </div>
      <p className="text-sm text-slate-600">Identidad física SYSTRON (no MOT). Folio y etiqueta interna son la identidad principal.</p>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Folio</th>
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">Marca</th>
              <th className="px-4 py-3">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/app/equi/${row.id}`} className="text-accent hover:underline">
                    {row.folio}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.model}</td>
                <td className="px-4 py-3">{row.brand ?? "—"}</td>
                <td className="px-4 py-3">{row.equipmentType ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Sin equipos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
