"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { attendancePunches, employees } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function listEmployees(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(employees)
    .where(and(eq(employees.companyId, companyId), eq(employees.active, true)))
    .limit(200);
}

export async function createEmployeeAction(formData: FormData) {
  const session = await getSession();
  if (!session || !["ADMINISTRADOR", "CEO", "COORDINACION_ADMIN"].includes(session.role)) {
    throw new Error("Sin permiso");
  }
  const db = getDb();
  await db.insert(employees).values({
    companyId: session.activeCompany.id,
    employeeNumber: String(formData.get("employeeNumber") ?? "").trim(),
    fullName: String(formData.get("fullName") ?? "").trim(),
  });
  revalidatePath("/app/rrhh");
}

export async function kioskPunchAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "KIOSCO_ASISTENCIA") throw new Error("Solo kiosco");
  const employeeId = String(formData.get("employeeId") ?? "");
  const direction = String(formData.get("direction") ?? "IN");
  const db = getDb();
  await db.insert(attendancePunches).values({
    companyId: session.activeCompany.id,
    employeeId,
    direction,
  });
  revalidatePath("/app/kiosco");
}
