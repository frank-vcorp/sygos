"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import {
  attendances,
  diagnosisCorrections,
  diagnoses,
  equiUnits,
  externalServiceCases,
  motUnits,
  repairs,
  serviceOrders,
  technicalLogEntries,
  quotes,
  technicalProductionCredits,
} from "@/db/schema";
import { nextCompanyFolio } from "@/lib/folio";
import {
  assertSystronMotTechnicalRule,
  canAssignExternalService,
  canManageTechnicalState,
  canOverrideWarrantyCeo,
  canReturnDiagnosis,
  canValidateDiagnosis,
} from "@/lib/permissions-tecnica";
import { addMonths, diagnosisSnapshot, repairSnapshot } from "@/lib/technical-catalog";
import { ensureQuoteFromRepairPending, ensureQuoteFromValidatedDiagnosis } from "@/lib/pending-quotes";
import { revalidateCommercialHub } from "@/lib/revalidate-commercial-hub";
import { getSession } from "@/lib/session";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  return session;
}

export async function createAttendanceAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageTechnicalState(session, session.activeCompany.id)) {
    throw new Error("Sin permiso para abrir atenciones técnicas");
  }
  const attentionType = String(formData.get("attentionType") ?? "DIAGNOSTICO") as
    | "DIAGNOSTICO"
    | "REPARACION"
    | "DIAGNOSTICO_GARANTIA";
  const equiId = String(formData.get("equiId") ?? "") || null;
  const motId = String(formData.get("motId") ?? "") || null;
  const reportedFault = String(formData.get("reportedFault") ?? "").trim() || null;
  if (!equiId && !motId) throw new Error("Vincula EQUI o MOT");

  const db = getDb();
  if (equiId) {
    const [equi] = await db
      .select()
      .from(equiUnits)
      .where(and(eq(equiUnits.id, equiId), eq(equiUnits.companyId, session.activeCompany.id)))
      .limit(1);
    if (!equi) throw new Error("EQUI no encontrado");
    if (equi.warehouseStatus === "SIN_ENTRADA") {
      throw new Error("Registra la entrada física del equipo en Almacén antes de abrir la atención técnica.");
    }
  }
  let motOrigin: string | null = null;
  if (motId) {
    const [mot] = await db.select().from(motUnits).where(eq(motUnits.id, motId)).limit(1);
    if (!mot) throw new Error("MOT no encontrado");
    motOrigin = mot.originCompanyCode;
    assertSystronMotTechnicalRule(session.activeCompany.code, attentionType, motOrigin, true);
    if (
      session.activeCompany.code === "SERVOMOTORES" &&
      mot.custodyStatus === "PENDIENTE_INGRESO_SERVOMOTORES"
    ) {
      throw new Error("Confirma el ingreso físico del motor en Servomotores antes de abrir la atención técnica.");
    }
  }

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
    const snap = diagnosisSnapshot(session.activeCompany.code, priority);
    let warrantyReferencePaidEgressAt: Date | null = null;
    let warrantyValidUntil: Date | null = null;
    if (attentionType === "DIAGNOSTICO_GARANTIA" && motId) {
      const [mot] = await db.select().from(motUnits).where(eq(motUnits.id, motId)).limit(1);
      warrantyReferencePaidEgressAt = mot?.paidRepairEgressAt ?? mot?.egressAt ?? null;
      if (warrantyReferencePaidEgressAt) {
        warrantyValidUntil = addMonths(warrantyReferencePaidEgressAt, 6);
      }
    }
    await db.insert(diagnoses).values({
      attendanceId: row.id,
      priority,
      snapshotPriceMxn: snap.priceMxn,
      snapshotSlaDays: snap.slaDays,
      warrantyReferencePaidEgressAt,
      warrantyValidUntil,
    });
  }

  if (attentionType === "REPARACION") {
    const repairPriority = (String(formData.get("repairPriority") ?? "NORMAL") as "NORMAL" | "ALTA" | "EXPRESS") || "NORMAL";
    const snap = repairSnapshot(session.activeCompany.code, repairPriority);
    await db.insert(repairs).values({
      attendanceId: row.id,
      priority: repairPriority,
      snapshotIncrementPercent: snap.incrementPercent,
      snapshotSlaDays: snap.slaDays,
    });
    const n = await nextCompanyFolio(session.activeCompany.id, "OS");
    await db.insert(serviceOrders).values({
      companyId: session.activeCompany.id,
      attendanceId: row.id,
      folio: `OS-${n.padStart(4, "0")}`,
      status: "EN_ESPERA",
    });
  }

  revalidatePath("/app/tecnica");
  await revalidateCommercialHub({ equiId, motId, attendanceId: row.id });
  redirect(`/app/tecnica/${row.id}`);
}

export async function advanceDiagnosisStatusAction(formData: FormData) {
  const session = await requireSession();
  const diagnosisId = String(formData.get("diagnosisId") ?? "");
  const target = String(formData.get("target") ?? "");
  const db = getDb();
  const [diag] = await db.select().from(diagnoses).where(eq(diagnoses.id, diagnosisId)).limit(1);
  if (!diag) throw new Error("Diagnóstico no encontrado");
  const att = await getAttendanceByDiagnosis(diag.attendanceId);
  if (!att || !canManageTechnicalState(session, att.companyId)) throw new Error("Sin permiso");

  if (target === "EN_TRABAJO" && diag.status === "ABIERTO") {
    await db.update(diagnoses).set({ status: "EN_TRABAJO", updatedAt: sql`now()` }).where(eq(diagnoses.id, diagnosisId));
  } else if (target === "TERMINADO" && (diag.status === "EN_TRABAJO" || diag.status === "DEVUELTO_CORRECCION")) {
    const nextStatus =
      session.activeCompany.code === "SERVOMOTORES" && session.role === "GERENTE_OPERATIVO_SERVOMOTORES"
        ? "VALIDADO_GERENTE"
        : "PENDIENTE_VALIDACION_GERENTE";
    await db
      .update(diagnoses)
      .set({
        status: nextStatus,
        completedByUserId: session.id,
        managerValidatedAt: nextStatus === "VALIDADO_GERENTE" ? sql`now()` : null,
        productionAttributedUserId: nextStatus === "VALIDADO_GERENTE" ? session.id : null,
        updatedAt: sql`now()`,
      })
      .where(eq(diagnoses.id, diagnosisId));
    if (nextStatus === "VALIDADO_GERENTE") {
      await creditProduction(att.id, session.id);
      const q = await ensureQuoteFromValidatedDiagnosis(att.id, att.companyId, session.id);
      await revalidateCommercialHub({
        attendanceId: att.id,
        equiId: att.equiId,
        quoteId: q?.id ?? null,
      });
    }
  }
  revalidatePath(`/app/tecnica/${att.id}`);
}

async function creditProduction(attendanceId: string, userId: string) {
  const db = getDb();
  const existing = await db
    .select()
    .from(technicalProductionCredits)
    .where(eq(technicalProductionCredits.attendanceId, attendanceId))
    .limit(1);
  if (existing[0]) return;
  await db.insert(technicalProductionCredits).values({ attendanceId, userId });
}

async function getAttendanceByDiagnosis(attendanceId: string) {
  const db = getDb();
  const rows = await db.select().from(attendances).where(eq(attendances.id, attendanceId)).limit(1);
  return rows[0] ?? null;
}

export async function validateDiagnosisAction(formData: FormData) {
  const session = await requireSession();
  if (!canValidateDiagnosis(session)) throw new Error("Sin permiso");
  const diagnosisId = String(formData.get("diagnosisId") ?? "");
  const db = getDb();
  const [diag] = await db.select().from(diagnoses).where(eq(diagnoses.id, diagnosisId)).limit(1);
  if (!diag) throw new Error("No encontrado");
  if (diag.status !== "PENDIENTE_VALIDACION_GERENTE" && diag.status !== "TERMINADO") {
    throw new Error("El diagnóstico no está pendiente de validación");
  }
  const attributed = diag.completedByUserId ?? session.id;
  await db
    .update(diagnoses)
    .set({
      status: "VALIDADO_GERENTE",
      managerValidatedAt: sql`now()`,
      productionAttributedUserId: attributed,
      updatedAt: sql`now()`,
    })
    .where(eq(diagnoses.id, diagnosisId));
  const att = await getAttendanceByDiagnosis(diag.attendanceId);
  if (att) {
    await creditProduction(att.id, attributed);
    const q = await ensureQuoteFromValidatedDiagnosis(att.id, att.companyId, session.id);
    await revalidateCommercialHub({
      attendanceId: att.id,
      equiId: att.equiId,
      quoteId: q?.id ?? null,
    });
  }
}

export async function returnDiagnosisAction(formData: FormData) {
  const session = await requireSession();
  if (!canReturnDiagnosis(session)) throw new Error("Sin permiso");
  const diagnosisId = String(formData.get("diagnosisId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const instruction = String(formData.get("instruction") ?? "").trim();
  if (reason.length < 3 || instruction.length < 3) throw new Error("Motivo e instrucción requeridos (mín. 3 caracteres)");

  const db = getDb();
  await db.insert(diagnosisCorrections).values({
    diagnosisId,
    reason,
    instruction,
    authorUserId: session.id,
  });
  await db
    .update(diagnoses)
    .set({ status: "DEVUELTO_CORRECCION", updatedAt: sql`now()` })
    .where(eq(diagnoses.id, diagnosisId));
  const [diag] = await db.select().from(diagnoses).where(eq(diagnoses.id, diagnosisId)).limit(1);
  if (diag) revalidatePath(`/app/tecnica/${diag.attendanceId}`);
}

export async function resolveWarrantyAction(formData: FormData) {
  const session = await requireSession();
  if (!canValidateDiagnosis(session)) throw new Error("Sin permiso");
  const diagnosisId = String(formData.get("diagnosisId") ?? "");
  const outcome = String(formData.get("outcome") ?? "") as "PROCEDENTE" | "NO_PROCEDENTE";
  const db = getDb();
  const [diag] = await db.select().from(diagnoses).where(eq(diagnoses.id, diagnosisId)).limit(1);
  if (!diag) throw new Error("No encontrado");
  await db
    .update(diagnoses)
    .set({ warrantyOutcome: outcome, updatedAt: sql`now()` })
    .where(eq(diagnoses.id, diagnosisId));
  const att = await getAttendanceByDiagnosis(diag.attendanceId);
  if (att && outcome === "NO_PROCEDENTE") {
    const q = await ensureQuoteFromValidatedDiagnosis(att.id, att.companyId, session.id);
    if (q) {
      await db
        .update(quotes)
        .set({ pendingOrigin: "GARANTIA_NO_PROCEDENTE", updatedAt: sql`now()` })
        .where(eq(quotes.id, q.id));
    }
    await revalidateCommercialHub({
      attendanceId: att.id,
      equiId: att.equiId,
      quoteId: q?.id ?? null,
    });
  } else {
    revalidatePath(`/app/tecnica/${diag.attendanceId}`);
  }
}

export async function ceoOverrideWarrantyAction(formData: FormData) {
  const session = await requireSession();
  if (!canOverrideWarrantyCeo(session)) throw new Error("Solo CEO/Administrador");
  const diagnosisId = String(formData.get("diagnosisId") ?? "");
  const db = getDb();
  const [diag] = await db.select().from(diagnoses).where(eq(diagnoses.id, diagnosisId)).limit(1);
  if (!diag || diag.warrantyOutcome !== "NO_PROCEDENTE") throw new Error("Solo sobre garantía no procedente");
  await db
    .update(diagnoses)
    .set({ warrantyOutcome: "CEO_VALIDADA", updatedAt: sql`now()` })
    .where(eq(diagnoses.id, diagnosisId));
  revalidatePath(`/app/tecnica/${diag.attendanceId}`);
}

export async function updateRepairStatusAction(formData: FormData) {
  const session = await requireSession();
  const repairId = String(formData.get("repairId") ?? "");
  const status = String(formData.get("status") ?? "") as (typeof repairs.$inferSelect)["status"];
  const db = getDb();
  const [repair] = await db.select().from(repairs).where(eq(repairs.id, repairId)).limit(1);
  if (!repair) throw new Error("Reparación no encontrada");
  const att = await getAttendanceByDiagnosis(repair.attendanceId);
  if (!att || !canManageTechnicalState(session, att.companyId)) throw new Error("Sin permiso");

  await db
    .update(repairs)
    .set({
      status,
      updatedAt: sql`now()`,
      ...(status === "REPARACION_TERMINADA" || status === "SIN_REPARACION"
        ? { completedByUserId: session.id, productionAttributedUserId: session.id }
        : {}),
    })
    .where(eq(repairs.id, repairId));

  if (status === "REPARACION_TERMINADA" || status === "SIN_REPARACION") {
    await creditProduction(att.id, session.id);
    const q = await ensureQuoteFromRepairPending(att.id, att.companyId, session.id);
    await revalidateCommercialHub({
      attendanceId: att.id,
      equiId: att.equiId,
      quoteId: q?.id ?? null,
    });
  }

  const [os] = await db.select().from(serviceOrders).where(eq(serviceOrders.attendanceId, att.id)).limit(1);
  if (os) {
    const osStatus =
      status === "EN_ESPERA_REFACCIONES"
        ? "EN_ESPERA_REFACCIONES"
        : status === "EN_REPARACION"
          ? "EN_REPARACION"
          : status === "REPARACION_TERMINADA"
            ? "REPARACION_TERMINADA"
            : status === "SIN_REPARACION"
              ? "SIN_REPARACION"
              : os.status;
    await db.update(serviceOrders).set({ status: osStatus, updatedAt: sql`now()` }).where(eq(serviceOrders.id, os.id));
  }
  revalidatePath(`/app/tecnica/${att.id}`);
}

export async function registerExternalServiceOutboundAction(formData: FormData) {
  const session = await requireSession();
  if (!canAssignExternalService(session)) throw new Error("Sin permiso");
  const attendanceId = String(formData.get("attendanceId") ?? "");
  const supplierId = String(formData.get("supplierId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const db = getDb();
  await db.insert(externalServiceCases).values({
    companyId: session.activeCompany.id,
    attendanceId,
    supplierId,
    outboundAt: sql`now()`,
    outboundNote: note || null,
    createdByUserId: session.id,
  });
  revalidatePath(`/app/tecnica/${attendanceId}`);
}

export async function registerExternalServiceInboundAction(formData: FormData) {
  const session = await requireSession();
  if (!canAssignExternalService(session)) throw new Error("Sin permiso");
  const caseId = String(formData.get("caseId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const db = getDb();
  await db
    .update(externalServiceCases)
    .set({ inboundAt: sql`now()`, inboundNote: note || null })
    .where(eq(externalServiceCases.id, caseId));
  const [row] = await db.select().from(externalServiceCases).where(eq(externalServiceCases.id, caseId)).limit(1);
  if (row) revalidatePath(`/app/tecnica/${row.attendanceId}`);
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
  if (attendanceId) {
    const att = await getAttendance(attendanceId, session.activeCompany.id);
    if (!att || !canManageTechnicalState(session, att.companyId)) {
      if (session.activeCompany.code === "SYSTRON" && att?.motId) {
        throw new Error("No puedes editar estados técnicos de Servomotores desde SYSTRON");
      }
      throw new Error("Sin permiso");
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

export async function createServiceOrderAction(formData: FormData) {
  const session = await requireSession();
  const attendanceId = String(formData.get("attendanceId") ?? "");
  const att = await getAttendance(attendanceId, session.activeCompany.id);
  if (!att || !canManageTechnicalState(session, att.companyId)) throw new Error("Sin permiso");
  const n = await nextCompanyFolio(session.activeCompany.id, "OS");
  const folio = `OS-${n.padStart(4, "0")}`;
  const db = getDb();
  await db.insert(serviceOrders).values({
    companyId: session.activeCompany.id,
    attendanceId,
    folio,
  });
  revalidatePath(`/app/tecnica/${attendanceId}`);
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

export async function listAttendancesForBoard(companyId: string) {
  const db = getDb();
  return db
    .select({
      attendance: attendances,
      diagnosisStatus: diagnoses.status,
      equiFolio: equiUnits.folio,
      motFolio: motUnits.folio,
    })
    .from(attendances)
    .leftJoin(diagnoses, eq(diagnoses.attendanceId, attendances.id))
    .leftJoin(equiUnits, eq(equiUnits.id, attendances.equiId))
    .leftJoin(motUnits, eq(motUnits.id, attendances.motId))
    .where(and(eq(attendances.companyId, companyId), eq(attendances.active, true)))
    .orderBy(desc(attendances.updatedAt))
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

export async function getAttendanceDetail(id: string, companyId: string) {
  const att = await getAttendance(id, companyId);
  if (!att) return null;
  const db = getDb();
  const [diag] = await db.select().from(diagnoses).where(eq(diagnoses.attendanceId, id)).limit(1);
  const [repair] = await db.select().from(repairs).where(eq(repairs.attendanceId, id)).limit(1);
  const os = await db.select().from(serviceOrders).where(eq(serviceOrders.attendanceId, id)).limit(1);
  const corrections = diag
    ? await db
        .select()
        .from(diagnosisCorrections)
        .where(eq(diagnosisCorrections.diagnosisId, diag.id))
        .orderBy(desc(diagnosisCorrections.createdAt))
    : [];
  const externalCases = await db
    .select()
    .from(externalServiceCases)
    .where(eq(externalServiceCases.attendanceId, id));
  const production = await db
    .select()
    .from(technicalProductionCredits)
    .where(eq(technicalProductionCredits.attendanceId, id))
    .limit(1);
  const logs = await db
    .select()
    .from(technicalLogEntries)
    .where(eq(technicalLogEntries.attendanceId, id))
    .orderBy(desc(technicalLogEntries.createdAt))
    .limit(50);
  return { att, diag, repair, os, corrections, externalCases, production: production[0] ?? null, logs };
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

export async function listAttendancesForMot(motId: string) {
  const db = getDb();
  return db
    .select()
    .from(attendances)
    .where(and(eq(attendances.motId, motId), eq(attendances.active, true)))
    .orderBy(desc(attendances.createdAt))
    .limit(20);
}
