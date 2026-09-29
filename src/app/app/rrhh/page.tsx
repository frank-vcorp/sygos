import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createEmployeeAction, listEmployees } from "./actions";

export default async function RrhhPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMINISTRADOR", "CEO", "COORDINACION_ADMIN"].includes(session.role)) redirect("/app");
  const rows = await listEmployees(session.activeCompany.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Personal — {session.activeCompany.displayName}</h1>
      <form action={createEmployeeAction} className="flex flex-wrap gap-2 rounded border bg-card p-4">
        <input name="employeeNumber" required placeholder="# empleado" className="rounded border px-2 py-1 text-sm" />
        <input name="fullName" required placeholder="Nombre" className="rounded border px-2 py-1 text-sm" />
        <button type="submit" className="rounded bg-accent px-3 py-1 text-sm text-white">Alta</button>
      </form>
      <ul className="text-sm">
        {rows.map((e) => (
          <li key={e.id} className="border-b py-2">{e.employeeNumber} — {e.fullName}</li>
        ))}
      </ul>
    </div>
  );
}
