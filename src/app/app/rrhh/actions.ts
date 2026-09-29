"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import {
  attendancePunches,
  employees,
  overtimeRequests,
  payrollLines,
  payrollRuns,
  salaryHistoryEntries,
  vacationRequests,
} from "@/db/schema";
import { countBusinessDays, isoWeekKey, splitOvertimeHours, vacationPremiumMxn } from "@/lib/payroll-rules";
import { getSession } from "@/lib/session";

export async function listEmployees(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(employees)
    .where(and(eq(employees.companyId, companyId), eq(employees.active, true)))
    .limit(200);
}

export async function listPayrollRuns(companyId: string) {
  const db = getDb();
  return db.select().from(payrollRuns).where(eq(payrollRuns.companyId, companyId)).orderBy(desc(payrollRuns.createdAt)).limit(20);
}

export async function listVacationRequests(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(vacationRequests)
    .where(eq(vacationRequests.companyId, companyId))
    .orderBy(desc(vacationRequests.createdAt))
    .limit(50);
}

export async function createEmployeeAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMINISTRADOR", "CEO", "COORDINACION_ADMIN"].includes(session.role)) {
    throw new Error("Sin permiso");
  }
  const db = getDb();
  const kioskEligible = formData.get("kioskEligible") !== "off";
  const fixedSalaryOnly = formData.get("fixedSalaryOnly") === "on";
  const stamped = Number(formData.get("salaryStampedMxn") ?? 0) || null;
  const cash = Number(formData.get("salaryCashMxn") ?? 0) || null;
  const managerId = String(formData.get("managerId") ?? "") || null;
  const [emp] = await db
    .insert(employees)
    .values({
      companyId: session.activeCompany.id,
      employeeNumber: String(formData.get("employeeNumber") ?? "").trim(),
      fullName: String(formData.get("fullName") ?? "").trim(),
      managerId,
      kioskEligible,
      fixedSalaryOnly,
      salaryStampedMxn: stamped,
      salaryCashMxn: cash,
    })
    .returning();
  if (stamped) {
    await db.insert(salaryHistoryEntries).values({
      employeeId: emp.id,
      stampedMxn: stamped,
      cashMxn: cash ?? 0,
    });
  }
  revalidatePath("/app/rrhh");
}

export async function requestVacationAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  const employeeId = String(formData.get("employeeId") ?? "");
  const start = new Date(String(formData.get("startDate") ?? ""));
  const end = new Date(String(formData.get("endDate") ?? ""));
  const businessDays = countBusinessDays(start, end);
  const db = getDb();
  await db.insert(vacationRequests).values({
    companyId: session.activeCompany.id,
    employeeId,
    startDate: start,
    endDate: end,
    businessDays,
    requestedByUserId: session.id,
  });
  revalidatePath("/app/rrhh");
}

export async function approveVacationAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMINISTRADOR", "CEO"].includes(session.role)) throw new Error("Solo CEO/Admin");
  const id = String(formData.get("vacationId") ?? "");
  const db = getDb();
  await db
    .update(vacationRequests)
    .set({ status: "AUTORIZADA", approvedByUserId: session.id })
    .where(eq(vacationRequests.id, id));
  revalidatePath("/app/rrhh");
}

export async function requestOvertimeAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  const employeeId = String(formData.get("employeeId") ?? "");
  const hours = Number(formData.get("hours") ?? 0);
  const weekKey = isoWeekKey();
  const db = getDb();
  const prior = await db
    .select()
    .from(overtimeRequests)
    .where(and(eq(overtimeRequests.employeeId, employeeId), eq(overtimeRequests.weekKey, weekKey)));
  const weeklyBefore = prior.reduce((s, r) => s + r.hoursDouble + r.hoursTriple, 0);
  const split = splitOvertimeHours(weeklyBefore, hours);
  await db.insert(overtimeRequests).values({
    companyId: session.activeCompany.id,
    employeeId,
    weekKey,
    hoursDouble: split.hoursDouble,
    hoursTriple: split.hoursTriple,
    originatedByUserId: session.id,
  });
  revalidatePath("/app/rrhh");
}

export async function approveOvertimeAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMINISTRADOR", "CEO"].includes(session.role)) throw new Error("Solo CEO/Admin");
  const id = String(formData.get("overtimeId") ?? "");
  const db = getDb();
  await db.update(overtimeRequests).set({ approvedByUserId: session.id }).where(eq(overtimeRequests.id, id));
  revalidatePath("/app/rrhh");
}

export async function createWeeklyPayrollAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMINISTRADOR", "CEO", "COORDINACION_ADMIN"].includes(session.role)) throw new Error("Sin permiso");
  const weekKey = String(formData.get("weekKey") ?? isoWeekKey());
  const db = getDb();
  const staff = await listEmployees(session.activeCompany.id);
  let payrollRun = (
    await db
      .select()
      .from(payrollRuns)
      .where(and(eq(payrollRuns.companyId, session.activeCompany.id), eq(payrollRuns.weekKey, weekKey)))
      .limit(1)
  )[0];
  if (!payrollRun) {
    const [run] = await db
      .insert(payrollRuns)
      .values({ companyId: session.activeCompany.id, weekKey, status: "BORRADOR" })
      .returning();
    payrollRun = run;
  }
  if (!payrollRun || payrollRun.status !== "BORRADOR") throw new Error("Nómina no editable");

  for (const e of staff) {
    if (e.fixedSalaryOnly) {
      const gross = e.salaryStampedMxn ?? 0;
      await db.insert(payrollLines).values({
        payrollRunId: payrollRun.id,
        employeeId: e.id,
        grossMxn: Math.round(gross / 4),
      });
      continue;
    }
    const stamped = e.salaryStampedMxn ?? 0;
    const cash = e.salaryCashMxn ?? 0;
    const gross = Math.round((stamped + cash) / 4);
    const [vac] = await db
      .select()
      .from(vacationRequests)
      .where(and(eq(vacationRequests.employeeId, e.id), eq(vacationRequests.status, "AUTORIZADA")))
      .limit(1);
    const premium = vac ? vacationPremiumMxn(stamped, cash, Math.min(vac.businessDays, 5)) : 0;
    await db.insert(payrollLines).values({
      payrollRunId: payrollRun.id,
      employeeId: e.id,
      grossMxn: gross,
      vacationPremiumMxn: Math.round(premium / 4),
    });
  }
  revalidatePath("/app/rrhh");
}

export async function authorizePayrollAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMINISTRADOR", "CEO"].includes(session.role)) throw new Error("Solo CEO/Admin");
  const runId = String(formData.get("payrollRunId") ?? "");
  const db = getDb();
  await db
    .update(payrollRuns)
    .set({ status: "AUTORIZADA", authorizedAt: sql`now()` })
    .where(eq(payrollRuns.id, runId));
  revalidatePath("/app/rrhh");
}

export async function retryPayrollStampAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMINISTRADOR", "CEO", "COORDINACION_ADMIN"].includes(session.role)) throw new Error("Sin permiso");
  const runId = String(formData.get("payrollRunId") ?? "");
  const db = getDb();
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId)).limit(1);
  if (!run || run.status === "CERRADA") throw new Error("Nómina no reintentable");
  await db
    .update(payrollRuns)
    .set({ status: "TIMBRADO_FALLIDO", stampError: "Timbrado nómina no configurado — datos guardados" })
    .where(eq(payrollRuns.id, runId));
  revalidatePath("/app/rrhh");
}

export async function kioskPunchAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "KIOSCO_ASISTENCIA") throw new Error("Solo kiosco");
  const employeeId = String(formData.get("employeeId") ?? "");
  const direction = String(formData.get("direction") ?? "IN");
  const db = getDb();
  const [emp] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  if (!emp?.kioskEligible) throw new Error("Colaborador no elegible para kiosco");
  await db.insert(attendancePunches).values({
    companyId: session.activeCompany.id,
    employeeId,
    direction,
  });
  revalidatePath("/app/kiosco");
}
