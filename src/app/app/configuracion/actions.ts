"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { companySettings, testSessionParticipants, testSessions, users } from "@/db/schema";
import { getActiveTestSession } from "@/lib/test-mode";
import { getSession } from "@/lib/session";

export async function toggleTestModeAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMINISTRADOR") throw new Error("Solo Administrador");
  const enabled = formData.get("enabled") === "on";
  const db = getDb();
  await db
    .insert(companySettings)
    .values({ companyId: session.activeCompany.id, testModeEnabled: enabled })
    .onConflictDoUpdate({
      target: companySettings.companyId,
      set: { testModeEnabled: enabled, updatedAt: sql`now()` },
    });
  revalidatePath("/app/configuracion");
}

export async function updateFiscalSettingsAction(formData: FormData) {
  const session = await getSession();
  if (!session || (session.role !== "ADMINISTRADOR" && session.role !== "CEO")) throw new Error("Sin permiso");
  const db = getDb();
  await db
    .insert(companySettings)
    .values({
      companyId: session.activeCompany.id,
      fiscalLegalName: String(formData.get("fiscalLegalName") ?? "").trim() || null,
      fiscalRfc: String(formData.get("fiscalRfc") ?? "").trim() || null,
      monthlyPurchaseBudgetMxn: Number(formData.get("monthlyPurchaseBudgetMxn") ?? 5000),
      maxDirectPurchaseMxn: Number(formData.get("maxDirectPurchaseMxn") ?? 2000),
    })
    .onConflictDoUpdate({
      target: companySettings.companyId,
      set: {
        fiscalLegalName: String(formData.get("fiscalLegalName") ?? "").trim() || null,
        fiscalRfc: String(formData.get("fiscalRfc") ?? "").trim() || null,
        monthlyPurchaseBudgetMxn: Number(formData.get("monthlyPurchaseBudgetMxn") ?? 5000),
        maxDirectPurchaseMxn: Number(formData.get("maxDirectPurchaseMxn") ?? 2000),
        updatedAt: sql`now()`,
      },
    });
  revalidatePath("/app/configuracion");
  revalidatePath("/app/finanzas");
  revalidatePath("/app/compras");
}

export async function startTestSessionAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMINISTRADOR") throw new Error("Solo Administrador");
  const existing = await getActiveTestSession();
  if (existing) throw new Error("Ya hay una sesión de pruebas activa");
  const userIds = formData.getAll("userIds").map(String);
  const db = getDb();
  const [ts] = await db.insert(testSessions).values({ startedByUserId: session.id, active: true }).returning();
  for (const uid of userIds) {
    await db.insert(testSessionParticipants).values({ sessionId: ts.id, userId: uid });
  }
  revalidatePath("/app/configuracion");
}

export async function endTestSessionAction() {
  const session = await getSession();
  if (!session || session.role !== "ADMINISTRADOR") throw new Error("Solo Administrador");
  const active = await getActiveTestSession();
  if (!active) return;
  const { discardTestSessionMutations } = await import("@/lib/test-mode-guard");
  await discardTestSessionMutations(active.id);
  const db = getDb();
  await db
    .update(testSessions)
    .set({ active: false, endedAt: sql`now()` })
    .where(eq(testSessions.id, active.id));
  revalidatePath("/app/configuracion");
}

export async function listUsersForTestSelect() {
  const db = getDb();
  return db.select({ id: users.id, displayName: users.displayName, username: users.username }).from(users).limit(100);
}
