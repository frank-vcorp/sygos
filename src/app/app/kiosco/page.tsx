import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { kioskPunchAction, listEmployees } from "../rrhh/actions";

export default async function KioscoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "KIOSCO_ASISTENCIA" && session.role !== "ADMINISTRADOR") redirect("/app");
  const employees = await listEmployees(session.activeCompany.id);

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-2xl font-semibold text-center">Kiosco asistencia</h1>
      {employees.map((e) => (
        <div key={e.id} className="flex gap-2 rounded-xl border bg-card p-4">
          <span className="flex-1 text-lg">{e.fullName}</span>
          <form action={kioskPunchAction}>
            <input type="hidden" name="employeeId" value={e.id} />
            <input type="hidden" name="direction" value="IN" />
            <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-white">Entrada</button>
          </form>
          <form action={kioskPunchAction}>
            <input type="hidden" name="employeeId" value={e.id} />
            <input type="hidden" name="direction" value="OUT" />
            <button type="submit" className="rounded-lg bg-slate-600 px-4 py-2 text-white">Salida</button>
          </form>
        </div>
      ))}
    </div>
  );
}
