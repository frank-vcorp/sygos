import { redirect } from "next/navigation";
import { CalendarDays, Clock3, UserPlus, UserRoundCheck, Users } from "lucide-react";
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
import { DataTable } from "@/components/patterns/data-table";
import { MetricCard } from "@/components/patterns/metric-card";
import { PageHeader } from "@/components/patterns/page-header";
import { SectionCard } from "@/components/patterns/section-card";
import { buttonVariants } from "@/components/ui/button";
import { Field, FormActions, Input, Select } from "@/components/ui/form-fields";
import { EmptyState, StatusBadge } from "@/components/ui/surface";
import { formatMxnDisplay } from "@/lib/format-currency";

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
  const pendingVacations = vacations.filter((v) => v.status === "SOLICITADA").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Capital humano"
        title="Personal y nómina"
        description={`Colaboradores, incidencias y nómina de ${session.activeCompany.displayName}.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Colaboradores activos" value={rows.length} icon={Users} />
        <MetricCard
          label="Vacaciones pendientes"
          value={pendingVacations}
          hint={`${vacations.length} solicitudes en historial`}
          icon={CalendarDays}
          tone="amber"
        />
        <MetricCard label="Nóminas registradas" value={payrolls.length} icon={UserRoundCheck} tone="green" />
        <MetricCard label="Semana operativa" value={weekKey} icon={Clock3} />
      </div>

      <SectionCard
        icon={UserPlus}
        title="Alta de colaborador"
        description="Número de empleado, compensación y elegibilidad de kiosco."
        tone="accent"
      >
        <form action={createEmployeeAction} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="# empleado">
            <Input name="employeeNumber" required placeholder="Ej. 1042" />
          </Field>
          <Field label="Nombre completo">
            <Input name="fullName" required />
          </Field>
          <Field label="Sueldo timbrado (MXN)">
            <Input name="salaryStampedMxn" type="number" min={0} />
          </Field>
          <Field label="Efectivo (MXN)">
            <Input name="salaryCashMxn" type="number" min={0} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
            <input name="fixedSalaryOnly" type="checkbox" className="rounded" />
            Solo salario fijo (Gerente SM)
          </label>
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
            <input name="kioskEligible" type="checkbox" defaultChecked className="rounded" />
            Elegible para kiosco de asistencia
          </label>
          <FormActions className="sm:col-span-2 xl:col-span-4">
            <button type="submit" className={buttonVariants({ variant: "primary" })}>Dar de alta</button>
          </FormActions>
        </form>
      </SectionCard>

      <DataTable title="Directorio" description="Personal activo en la empresa seleccionada">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Sin colaboradores" description="Registra el primero con el formulario de alta." />
          </div>
        ) : (
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">#</th>
                <th className="px-5 py-3 font-semibold">Nombre</th>
                <th className="px-5 py-3 font-semibold">Compensación</th>
                <th className="px-5 py-3 font-semibold">Operación</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{e.employeeNumber}</td>
                  <td className="px-5 py-3 font-semibold">{e.fullName}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {formatMxnDisplay(e.salaryStampedMxn)}
                    {e.salaryCashMxn ? ` + ${formatMxnDisplay(e.salaryCashMxn)} ef.` : ""}
                  </td>
                  <td className="px-5 py-3">
                    {e.fixedSalaryOnly && <StatusBadge status="NÓMINA FIJA" />}
                    {!e.kioskEligible && <span className="text-xs text-slate-500">Sin kiosco</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DataTable>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard icon={CalendarDays} title="Vacaciones" description="Solicitud y autorización por CEO/Admin.">
          <form action={requestVacationAction} className="grid gap-3 sm:grid-cols-3">
            <Field label="Colaborador" className="sm:col-span-3">
              <Select name="employeeId" required>
                {rows.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Inicio">
              <Input name="startDate" type="date" required />
            </Field>
            <Field label="Fin">
              <Input name="endDate" type="date" required />
            </Field>
            <FormActions className="sm:items-end">
              <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Solicitar</button>
            </FormActions>
          </form>
          <ul className="mt-4 divide-y rounded-xl border border-border text-sm">
            {vacations.length === 0 && (
              <li className="px-4 py-3 text-slate-500">Sin solicitudes registradas.</li>
            )}
            {vacations.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  <span className="font-medium">{v.businessDays} días hábiles</span>
                  <StatusBadge status={v.status} className="ml-2" />
                </span>
                {v.status === "SOLICITADA" && ["CEO", "ADMINISTRADOR"].includes(session.role) && (
                  <form action={approveVacationAction}>
                    <input type="hidden" name="vacationId" value={v.id} />
                    <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Autorizar</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard icon={Clock3} title={`Horas extra · ${weekKey}`} description="Colaboradores con nómina variable.">
          <form action={requestOvertimeAction} className="flex flex-wrap items-end gap-3">
            <Field label="Colaborador">
              <Select name="employeeId" required className="min-w-[200px]">
                {rows.filter((e) => !e.fixedSalaryOnly).map((e) => (
                  <option key={e.id} value={e.id}>{e.fullName}</option>
                ))}
              </Select>
            </Field>
            <Field label="Horas">
              <Input name="hours" type="number" min={1} className="w-24" required />
            </Field>
            <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Registrar</button>
          </form>
        </SectionCard>
      </div>

      <SectionCard icon={UserRoundCheck} title="Nómina semanal" description="Genera borrador, autoriza y timbra según integración.">
        <form action={createWeeklyPayrollAction} className="flex flex-wrap items-end gap-3">
          <Field label="Semana">
            <Input name="weekKey" value={weekKey} readOnly className="w-36 bg-slate-50" />
          </Field>
          <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Generar borrador</button>
        </form>
        <ul className="mt-4 divide-y rounded-xl border border-border text-sm">
          {payrolls.length === 0 && <li className="px-4 py-3 text-slate-500">Aún no hay corridas de nómina.</li>}
          {payrolls.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="font-mono text-xs font-semibold">{p.weekKey}</span>
              <StatusBadge status={p.status} />
              {p.status === "BORRADOR" && ["CEO", "ADMINISTRADOR"].includes(session.role) && (
                <form action={authorizePayrollAction}>
                  <input type="hidden" name="payrollRunId" value={p.id} />
                  <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Autorizar</button>
                </form>
              )}
              {p.stampError && (
                <>
                  <span className="text-xs text-red-700">{p.stampError}</span>
                  <form action={retryPayrollStampAction}>
                    <input type="hidden" name="payrollRunId" value={p.id} />
                    <button type="submit" className={buttonVariants({ variant: "ghost", size: "sm" })}>Reintentar timbrado</button>
                  </form>
                </>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
