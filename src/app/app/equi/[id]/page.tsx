import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canViewEqui, getEqui } from "../../activos/actions";

export default async function EquiDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewEqui(session)) redirect("/app");

  const { id } = await params;
  const equi = await getEqui(session.activeCompany.id, id);
  if (!equi || !equi.active) notFound();

  return (
    <div className="space-y-4">
      <Link href="/app/equi" className="text-sm text-accent hover:underline">
        ← EQUI
      </Link>
      <h1 className="font-mono text-xl font-semibold">{equi.folio}</h1>
      <dl className="grid gap-3 rounded-xl border border-border bg-card p-6 text-sm sm:grid-cols-2">
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
      </dl>
    </div>
  );
}
