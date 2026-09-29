"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { inventoryParts } from "@/db/schema";
import { getCompanySettings } from "@/lib/company-settings";
import { getSession } from "@/lib/session";

async function requireInventory() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  const settings = await getCompanySettings(session.activeCompany.id);
  if (session.activeCompany.code === "SERVOMOTORES" && !settings.servomotoresInventoryEnabled) {
    throw new Error("Inventario Servomotores deshabilitado (Administrador puede habilitarlo)");
  }
  const ok =
    session.role === "ADMINISTRADOR" ||
    session.role === "CEO" ||
    session.role === "GERENTE_OPERATIVO_SYSTRON" ||
    session.role === "ALMACEN_SYSTRON" ||
    session.role === "GERENTE_OPERATIVO_SERVOMOTORES";
  if (!ok) throw new Error("Sin permiso");
  return session;
}

export async function listInventoryParts(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(inventoryParts)
    .where(and(eq(inventoryParts.companyId, companyId), eq(inventoryParts.active, true)))
    .limit(300);
}

export async function createPartAction(formData: FormData) {
  const session = await requireInventory();
  const partNumber = String(formData.get("partNumber") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!partNumber || !description) throw new Error("Número de parte y descripción requeridos");
  const db = getDb();
  await db.insert(inventoryParts).values({
    companyId: session.activeCompany.id,
    partNumber,
    description,
    minQuantity: Number(formData.get("minQuantity") ?? 0) || null,
    maxQuantity: Number(formData.get("maxQuantity") ?? 0) || null,
  });
  revalidatePath("/app/inventario");
}

export async function adjustStockAction(formData: FormData) {
  const session = await requireInventory();
  const id = String(formData.get("id") ?? "");
  const delta = Number(formData.get("delta") ?? 0);
  if (!id || !delta) throw new Error("Datos inválidos");
  const db = getDb();
  await db
    .update(inventoryParts)
    .set({
      quantityOnHand: sql`${inventoryParts.quantityOnHand} + ${delta}`,
      updatedAt: sql`now()`,
    })
    .where(and(eq(inventoryParts.id, id), eq(inventoryParts.companyId, session.activeCompany.id)));
  revalidatePath("/app/inventario");
}

export async function toggleServomotoresInventoryAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMINISTRADOR") throw new Error("Solo Administrador");
  const enabled = formData.get("enabled") === "on";
  const db = getDb();
  const { companySettings } = await import("@/db/schema");
  await db
    .insert(companySettings)
    .values({ companyId: session.activeCompany.id, servomotoresInventoryEnabled: enabled })
    .onConflictDoUpdate({
      target: companySettings.companyId,
      set: { servomotoresInventoryEnabled: enabled, updatedAt: sql`now()` },
    });
  revalidatePath("/app/inventario");
  revalidatePath("/app/configuracion");
}
