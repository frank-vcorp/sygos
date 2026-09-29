import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  canConfirmMotIngress,
  canCreateMot,
  canViewMot,
  listMotVisible,
  listPendingMotIngress,
} from "../activos/actions";

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE_INGRESO_SERVOMOTORES: "Pendiente ingreso",
  EN_RESGUARDO_SERVOMOTORES: "En resguardo",
  EGRESADO: "Egresado",
};

export default async function MotPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewMot(session)) redirect("/app");

  const [rows, pending] = await Promise.all([listMotVisible(), listPendingMotIngress()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Motores (MOT)</h1>
        {canCreateMot(session) && (
          <Link href="/app/mot/nuevo" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white">
            Nuevo MOT
          </Link>
        )}
      </div>
      <p className="text-sm text-slate-600">
        Folio MOT global.{" "}
        {session.activeCompany.code === "SYSTRON"
          ? "SYSTRON solo ve MOT originados aquí; operación técnica en Servomotores."
          : "Servomotores ve MOT propios y MOT originados en SYSTRON."}
      </p>

      {canConfirmMotIngress(session) && pending.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Pendientes de ingreso físico ({pending.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {pending.map((m) => (
              <li key={m.id}>
                <Link href={`/app/mot/${m.id}`} className="font-mono text-accent hover:underline">
                  {m.folio}
                </Link>
                <span className="text-slate-600"> · {m.model}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Folio</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">Custodia</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/app/mot/${row.id}`} className="text-accent hover:underline">
                    {row.folio}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.originCompanyCode === "SYSTRON" ? "SYSTRON" : "Servomotores"}</td>
                <td className="px-4 py-3">{row.model}</td>
                <td className="px-4 py-3">{STATUS_LABEL[row.custodyStatus] ?? row.custodyStatus}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Sin MOT registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
