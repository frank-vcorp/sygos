"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import {
  attendances,
  diagnoses,
  motUnits,
  serviceOrders,
  technicalLogEntries,
} from "@/db/schema";
import { nextCompanyFolio } from "@/lib/folio";
import { getSession } from "@/lib/session";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  return session;
}

export async function createAttendanceAction(formData: FormData) {
  const session = await requireSession();
  const attentionType = String(formData.get("attentionType") ?? "DIAGNOSTICO") as
    | "DIAGNOSTICO"
    | "REPARACION"
    | "DIAGNOSTICO_GARANTIA";
  const equiId = String(formData.get("equiId") ?? "") || null;
  const motId = String(formData.get("motId") ?? "") || null;
  const reportedFault = String(formData.get("reportedFault") ?? "").trim() || null;
  if (!equiId && !motId) throw new Error("Vincula EQUI o MOT");

  const db = getDb();
  const [row] = await db
    .insert(attendances)
    .values({
      companyId: session.activeCompany.id,
      attentionType,
      equiId,
      motId,
      reportedFault,
      createdByUserId: session.id,
    })
    .returning();

  if (attentionType === "DIAGNOSTICO" || attentionType === "DIAGNOSTICO_GARANTIA") {
    const priority = (String(formData.get("priority") ?? "NORMAL") as "NORMAL" | "ALTA" | "EXPRESS") || "NORMAL";
    const prices: Record<string, { price: number; sla: number }> = {
      NORMAL: { price: 0, sla: 10 },
      ALTA: { price: 3500, sla: 5 },
      EXPRESS: { price: 4500, sla: 1 },
    };
    const snap = prices[priority] ?? prices.NORMAL;
    await db.insert(diagnoses).values({
      attendanceId: row.id,
      priority,
      snapshotPriceMxn: snap.price,
      snapshotSlaDays: snap.sla,
    });
  }

  revalidatePath("/app/tecnica");
  redirect(`/app/tecnica/${row.id}`);
}

export async function addTechnicalLogAction(formData: FormData) {
  const session = await requireSession();
  const body = String(formData.get("body") ?? "").trim();
  const motId = String(formData.get("motId") ?? "") || null;
  const attendanceId = String(formData.get("attendanceId") ?? "") || null;
  if (!body || (!motId && !attendanceId)) throw new Error("Datos incompletos");

  if (motId && session.activeCompany.code === "SYSTRON") {
    const mot = await getDb().select().from(motUnits).where(eq(motUnits.id, motId)).limit(1);
    if (mot[0]?.originCompanyCode === "SYSTRON") {
      throw new Error("Bitácora de MOT SYSTRON en Servomotores: solo lectura desde SYSTRON");
    }
  }

  const db = getDb();
  await db.insert(technicalLogEntries).values({
    companyId: session.activeCompany.id,
    motId,
    attendanceId,
    body,
    authorUserId: session.id,
  });
  if (motId) revalidatePath(`/app/mot/${motId}`);
  revalidatePath("/app/tecnica");
}

export async function validateDiagnosisAction(formData: FormData) {
  const session = await requireSession();
  const diagnosisId = String(formData.get("diagnosisId") ?? "");
  const ok =
    session.role === "GERENTE_OPERATIVO_SYSTRON" ||
    session.role === "GERENTE_OPERATIVO_SERVOMOTORES" ||
    session.role === "ADMINISTRADOR" ||
    session.role === "CEO";
  if (!ok) throw new Error("Sin permiso");
  const db = getDb();
  await db
    .update(diagnoses)
    .set({ status: "VALIDADO_GERENTE", managerValidatedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(diagnoses.id, diagnosisId));
  revalidatePath("/app/tecnica");
}

export async function createServiceOrderAction(formData: FormData) {
  const session = await requireSession();
  const attendanceId = String(formData.get("attendanceId") ?? "");
  const n = await nextCompanyFolio(session.activeCompany.id, "OS");
  const folio = `OS-${n.padStart(4, "0")}`;
  const db = getDb();
  await db.insert(serviceOrders).values({
    companyId: session.activeCompany.id,
    attendanceId,
    folio,
  });
  revalidatePath("/app/tecnica");
}

export async function listAttendances(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(attendances)
    .where(and(eq(attendances.companyId, companyId), eq(attendances.active, true)))
    .orderBy(desc(attendances.createdAt))
    .limit(100);
}

export async function getAttendance(id: string, companyId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(attendances)
    .where(and(eq(attendances.id, id), eq(attendances.companyId, companyId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listTechnicalLogForMot(motId: string) {
  const db = getDb();
  return db
    .select()
    .from(technicalLogEntries)
    .where(eq(technicalLogEntries.motId, motId))
    .orderBy(desc(technicalLogEntries.createdAt))
    .limit(100);
}
