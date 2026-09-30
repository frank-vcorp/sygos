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
import { PageHeader } from "@/components/patterns/page-header";
import { MetricCard } from "@/components/patterns/metric-card";
import { Card, StatusBadge } from "@/components/ui/surface";
import { CalendarDays, Clock3, UserRoundCheck, Users } from "lucide-react";

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
    <div>
      <PageHeader
        eyebrow="Capital humano"
        title="Personal y nómina"
        description={`Colaboradores, incidencias y nómina de ${session.activeCompany.displayName}.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Colaboradores activos" value={rows.length} icon={Users} />
        <MetricCard label="Vacaciones registradas" value={vacations.length} icon={CalendarDays} tone="amber" />
        <MetricCard label="Nóminas recientes" value={payrolls.length} icon={UserRoundCheck} tone="green" />
        <MetricCard label="Semana operativa" value={weekKey} icon={Clock3} />
      </div>
      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold">Alta de colaborador</h2>
        <p className="mt-1 text-xs text-slate-500">Registra datos laborales y elegibilidad operativa.</p>
      <form action={createEmployeeAction} className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
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
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 font-semibold text-white">Dar de alta</button>
      </form>
      </Card>
      <Card className="mt-6 overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Directorio de colaboradores</h2>
          <p className="text-xs text-slate-500">Personal activo en la empresa seleccionada</p>
        </div>
      <ul className="divide-y text-sm">
        {rows.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-2 px-5 py-3.5">
            <span className="font-mono text-xs text-slate-500">{e.employeeNumber}</span>
            <span className="font-semibold">{e.fullName}</span>
            {e.fixedSalaryOnly && <StatusBadge status="NÓMINA FIJA" />}
            {!e.kioskEligible && <span className="text-xs text-slate-500">Sin kiosco</span>}
          </li>
        ))}
      </ul>
      </Card>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
      <Card className="p-5 text-sm">
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
      </Card>
      <Card className="p-5 text-sm">
        <h2 className="font-medium">Horas extra (semana {weekKey})</h2>
        <form action={requestOvertimeAction} className="mt-2 flex gap-2">
          <select name="employeeId" className="rounded border px-2 py-1">
            {rows.filter((e) => !e.fixedSalaryOnly).map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
          <input name="hours" type="number" min={1} className="w-16 rounded border px-2 py-1" />
          <button type="submit" className="rounded border px-2 py-1">Registrar</button>
        </form>
      </Card>
      </div>
      <Card className="mt-6 p-5 text-sm">
        <h2 className="font-medium">Nómina semanal</h2>
        <form action={createWeeklyPayrollAction} className="mt-2 flex gap-2">
          <input name="weekKey" value={weekKey} readOnly className="rounded border px-2 py-1" />
          <button type="submit" className="rounded bg-accent px-3 py-1 text-white">Generar borrador</button>
        </form>
        <ul className="mt-2">
          {payrolls.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 border-b py-1">
              <span className="font-semibold">{p.weekKey}</span>
              <StatusBadge status={p.status} />
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
      </Card>
    </div>
  );
}
