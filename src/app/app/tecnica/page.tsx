import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listAttendances } from "./actions";

export default async function TecnicaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const rows = await listAttendances(session.activeCompany.id);

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3">
        <h1 className="text-xl font-semibold">Operación técnica</h1>
        <Link href="/app/tecnica/nueva" className="rounded-md bg-accent px-3 py-2 text-sm text-white">Nueva atención</Link>
      </div>
      <ul className="divide-y rounded-xl border border-border bg-card">
        {rows.map((a) => (
          <li key={a.id} className="px-4 py-3 text-sm">
            <Link href={`/app/tecnica/${a.id}`} className="font-medium text-accent hover:underline">
              {a.attentionType.replaceAll("_", " ")}
            </Link>
            <p className="text-slate-600">{a.reportedFault ?? "—"}</p>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-8 text-center text-slate-500">Sin atenciones.</li>}
      </ul>
    </div>
  );
}
