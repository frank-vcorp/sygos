import { redirect } from "next/navigation";
import { isoWeekKey } from "@/lib/payroll-rules";
import { getSession } from "@/lib/session";
import {
  approveVacationAction,
  authorizePayrollAction,
  createEmployeeAction,
  createWeeklyPayrollAction,
  listEmployees,
  listPayrollRuns,
  listVacationRequests,
  requestOvertimeAction,
  requestVacationAction,
  retryPayrollStampAction,
} from "./actions";

export default async function RrhhPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMINISTRADOR", "CEO", "COORDINACION_ADMIN"].includes(session.role)) redirect("/app");
  const companyId = session.activeCompany.id;
  const [rows, vacations, payrolls] = await Promise.all([
    listEmployees(companyId),
    listVacationRequests(companyId),
    listPayrollRuns(companyId),
  ]);
  const weekKey = isoWeekKey();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Personal y nómina — {session.activeCompany.displayName}</h1>
      <form action={createEmployeeAction} className="flex flex-wrap gap-2 rounded border bg-card p-4 text-sm">
        <input name="employeeNumber" required placeholder="# empleado" className="rounded border px-2 py-1" />
        <input name="fullName" required placeholder="Nombre" className="rounded border px-2 py-1" />
        <input name="salaryStampedMxn" type="number" placeholder="Sueldo timbrado" className="rounded border px-2 py-1" />
        <input name="salaryCashMxn" type="number" placeholder="Efectivo" className="rounded border px-2 py-1" />
        <label className="flex items-center gap-1">
          <input name="fixedSalaryOnly" type="checkbox" /> Solo salario fijo (Gerente SM)
        </label>
        <label className="flex items-center gap-1">
          <input name="kioskEligible" type="checkbox" defaultChecked /> Kiosco
        </label>
        <button type="submit" className="rounded bg-accent px-3 py-1 text-white">Alta</button>
      </form>
      <ul className="text-sm">
        {rows.map((e) => (
          <li key={e.id} className="border-b py-2">
            {e.employeeNumber} — {e.fullName}
            {e.fixedSalaryOnly && " · nómina fija"}
            {!e.kioskEligible && " · sin kiosco"}
          </li>
        ))}
      </ul>
      <section className="rounded border p-4 text-sm">
        <h2 className="font-medium">Vacaciones</h2>
        <form action={requestVacationAction} className="mt-2 flex flex-wrap gap-2">
          <select name="employeeId" className="rounded border px-2 py-1">
            {rows.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
          <input name="startDate" type="date" required className="rounded border px-2 py-1" />
          <input name="endDate" type="date" required className="rounded border px-2 py-1" />
          <button type="submit" className="rounded border px-2 py-1">Solicitar</button>
        </form>
        <ul className="mt-2">
          {vacations.map((v) => (
            <li key={v.id} className="flex gap-2 border-b py-1">
              {v.businessDays} días hábiles — {v.status}
              {v.status === "SOLICITADA" && ["CEO", "ADMINISTRADOR"].includes(session.role) && (
                <form action={approveVacationAction}>
                  <input type="hidden" name="vacationId" value={v.id} />
                  <button type="submit" className="text-accent">Autorizar</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded border p-4 text-sm">
        <h2 className="font-medium">Horas extra (semana {weekKey})</h2>
        <form action={requestOvertimeAction} className="mt-2 flex gap-2">
          <select name="employeeId" className="rounded border px-2 py-1">
            {rows.filter((e) => !e.fixedSalaryOnly).map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
          <input name="hours" type="number" min={1} className="w-16 rounded border px-2 py-1" />
          <button type="submit" className="rounded border px-2 py-1">Registrar</button>
        </form>
      </section>
      <section className="rounded border p-4 text-sm">
        <h2 className="font-medium">Nómina semanal</h2>
        <form action={createWeeklyPayrollAction} className="mt-2 flex gap-2">
          <input name="weekKey" value={weekKey} readOnly className="rounded border px-2 py-1" />
          <button type="submit" className="rounded bg-accent px-3 py-1 text-white">Generar borrador</button>
        </form>
        <ul className="mt-2">
          {payrolls.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 border-b py-1">
              {p.weekKey} — {p.status}
              {p.status === "BORRADOR" && ["CEO", "ADMINISTRADOR"].includes(session.role) && (
                <form action={authorizePayrollAction}>
                  <input type="hidden" name="payrollRunId" value={p.id} />
                  <button type="submit" className="text-accent">Autorizar</button>
                </form>
              )}
              {p.stampError && (
                <form action={retryPayrollStampAction}>
                  <input type="hidden" name="payrollRunId" value={p.id} />
                  <button type="submit" className="text-accent">Reintentar timbrado</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
