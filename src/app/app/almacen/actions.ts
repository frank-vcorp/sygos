"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { equiUnits } from "@/db/schema";
import { getSession } from "@/lib/session";

async function requireSystronWarehouse() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  if (session.activeCompany.code !== "SYSTRON") throw new Error("Almacén SYSTRON solo en empresa SYSTRON");
  const ok =
    session.role === "ADMINISTRADOR" ||
    session.role === "CEO" ||
    session.role === "ALMACEN_SYSTRON" ||
    session.role === "GERENTE_OPERATIVO_SYSTRON";
  if (!ok) throw new Error("Sin permiso");
  return session;
}

export async function listEquiWarehouse(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(equiUnits)
    .where(and(eq(equiUnits.companyId, companyId), eq(equiUnits.active, true)))
    .limit(200);
}

export async function registerEquiEntryAction(formData: FormData) {
  const session = await requireSystronWarehouse();
  const id = String(formData.get("equiId") ?? "");
  const version = Number(formData.get("version") ?? 0);
  const db = getDb();
  const updated = await db
    .update(equiUnits)
    .set({ warehouseStatus: "EN_RESGUARDO", version: version + 1, updatedAt: sql`now()` })
    .where(
      and(
        eq(equiUnits.id, id),
        eq(equiUnits.companyId, session.activeCompany.id),
        eq(equiUnits.version, version),
        eq(equiUnits.warehouseStatus, "SIN_ENTRADA"),
      ),
    )
    .returning({ id: equiUnits.id });
  if (updated.length === 0) throw new Error("No se pudo registrar entrada");
  revalidatePath("/app/almacen");
  revalidatePath(`/app/equi/${id}`);
}

export async function registerEquiTrialExitAction(formData: FormData) {
  const session = await requireSystronWarehouse();
  const id = String(formData.get("equiId") ?? "");
  const version = Number(formData.get("version") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 3) throw new Error("Indica motivo de salida a prueba");
  const db = getDb();
  await db
    .update(equiUnits)
    .set({ warehouseStatus: "SALIDA_PRUEBA", version: version + 1, updatedAt: sql`now()` })
    .where(
      and(eq(equiUnits.id, id), eq(equiUnits.companyId, session.activeCompany.id), eq(equiUnits.version, version)),
    );
  revalidatePath("/app/almacen");
}

export async function registerEquiReturnFromTrialAction(formData: FormData) {
  const session = await requireSystronWarehouse();
  const id = String(formData.get("equiId") ?? "");
  const version = Number(formData.get("version") ?? 0);
  const db = getDb();
  await db
    .update(equiUnits)
    .set({ warehouseStatus: "EN_RESGUARDO", version: version + 1, updatedAt: sql`now()` })
    .where(
      and(
        eq(equiUnits.id, id),
        eq(equiUnits.companyId, session.activeCompany.id),
        eq(equiUnits.warehouseStatus, "SALIDA_PRUEBA"),
        eq(equiUnits.version, version),
      ),
    );
  revalidatePath("/app/almacen");
}
