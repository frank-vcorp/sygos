import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageProspects } from "@/lib/permissions";
import { createProspectAction, listProspects } from "../maestros/actions";

export default async function ProspectosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const rows = await listProspects(session.activeCompany.id);
  const canCreate = canManageProspects(session.role, session.activeCompany.code);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Prospectos</h1>
      {canCreate && (
        <form action={createProspectAction} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
          <input name="name" required placeholder="Empresa / nombre" className="rounded-md border border-border px-3 py-2 text-sm sm:col-span-2" />
          <input name="source" placeholder="Fuente" className="rounded-md border border-border px-3 py-2 text-sm" />
          <input name="note" placeholder="Nota" className="rounded-md border border-border px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white sm:col-span-2 sm:w-fit">
            Agregar prospecto
          </button>
        </form>
      )}
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <span className="font-medium">{row.name}</span>
            <span className="text-xs uppercase text-slate-500">{row.status.replaceAll("_", " ")}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-8 text-center text-slate-500">Sin prospectos.</li>}
      </ul>
      <Link href="/app" className="text-sm text-accent hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
