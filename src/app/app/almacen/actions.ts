"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { equiUnits } from "@/db/schema";
import { logEquiWarehouseEvent } from "@/lib/custody-events";
import { canManageSystronWarehouse } from "@/lib/permissions-activos";
import { getSession } from "@/lib/session";

async function requireSystronWarehouse() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  if (!canManageSystronWarehouse(session)) throw new Error("Sin permiso");
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
  await logEquiWarehouseEvent({
    equiId: id,
    fromStatus: "SIN_ENTRADA",
    toStatus: "EN_RESGUARDO",
    authorUserId: session.id,
  });
  revalidatePath("/app/almacen", "page");
  revalidatePath(`/app/equi/${id}`, "page");
  revalidatePath("/app/tecnica/nueva", "page");
  redirect(`/app/equi/${id}?entry=1`);
}

export async function registerEquiTrialExitAction(formData: FormData) {
  const session = await requireSystronWarehouse();
  const id = String(formData.get("equiId") ?? "");
  const version = Number(formData.get("version") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 3) throw new Error("Indica motivo de salida a prueba");
  const db = getDb();
  const updated = await db
    .update(equiUnits)
    .set({ warehouseStatus: "SALIDA_PRUEBA", version: version + 1, updatedAt: sql`now()` })
    .where(
      and(
        eq(equiUnits.id, id),
        eq(equiUnits.companyId, session.activeCompany.id),
        eq(equiUnits.warehouseStatus, "EN_RESGUARDO"),
        eq(equiUnits.version, version),
      ),
    )
    .returning({ id: equiUnits.id });
  if (updated.length === 0) throw new Error("No se pudo registrar salida a prueba");
  await logEquiWarehouseEvent({
    equiId: id,
    fromStatus: "EN_RESGUARDO",
    toStatus: "SALIDA_PRUEBA",
    note: reason,
    authorUserId: session.id,
  });
  revalidatePath("/app/almacen");
}

export async function registerEquiReturnFromTrialAction(formData: FormData) {
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
        eq(equiUnits.warehouseStatus, "SALIDA_PRUEBA"),
        eq(equiUnits.version, version),
      ),
    )
    .returning({ id: equiUnits.id });
  if (updated.length === 0) throw new Error("No se pudo registrar retorno");
  await logEquiWarehouseEvent({
    equiId: id,
    fromStatus: "SALIDA_PRUEBA",
    toStatus: "EN_RESGUARDO",
    note: "Retorno desde salida a prueba",
    authorUserId: session.id,
  });
  revalidatePath("/app/almacen");
}

export async function registerEquiDefinitiveExitAction(formData: FormData) {
  const session = await requireSystronWarehouse();
  const id = String(formData.get("equiId") ?? "");
  const version = Number(formData.get("version") ?? 0);
  const note = String(formData.get("note") ?? "").trim();
  const fromTrial = formData.get("fromTrial") === "1";
  if (note.length < 3) throw new Error("Indica destinatario y referencia en el motivo (mín. 3 caracteres)");
  const db = getDb();
  const [equi] = await db
    .select()
    .from(equiUnits)
    .where(and(eq(equiUnits.id, id), eq(equiUnits.companyId, session.activeCompany.id)))
    .limit(1);
  if (!equi) throw new Error("EQUI no encontrado");
  const okStatus = fromTrial
    ? equi.warehouseStatus === "SALIDA_PRUEBA"
    : equi.warehouseStatus === "EN_RESGUARDO" || equi.warehouseStatus === "SALIDA_PRUEBA";
  if (!okStatus) throw new Error("Estado no permite salida definitiva");

  const updated = await db
    .update(equiUnits)
    .set({ warehouseStatus: "SALIDA_DEFINITIVA", version: version + 1, updatedAt: sql`now()` })
    .where(
      and(eq(equiUnits.id, id), eq(equiUnits.companyId, session.activeCompany.id), eq(equiUnits.version, version)),
    )
    .returning({ id: equiUnits.id });
  if (updated.length === 0) throw new Error("Conflicto de versión");

  await logEquiWarehouseEvent({
    equiId: id,
    fromStatus: equi.warehouseStatus,
    toStatus: "SALIDA_DEFINITIVA",
    note: fromTrial ? `Salida definitiva desde prueba: ${note}` : note,
    authorUserId: session.id,
  });
  revalidatePath("/app/almacen");
  revalidatePath(`/app/equi/${id}`);
}
