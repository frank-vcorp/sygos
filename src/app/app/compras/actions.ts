"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { purchases } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function listPurchases(companyId: string) {
  const db = getDb();
  return db.select().from(purchases).where(eq(purchases.companyId, companyId)).orderBy(desc(purchases.createdAt)).limit(100);
}

export async function createPurchaseAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  const ok =
    session.role === "ADMINISTRADOR" ||
    session.role === "CEO" ||
    session.role === "COORDINACION_ADMIN" ||
    session.role === "GERENTE_OPERATIVO_SYSTRON" ||
    session.role === "GERENTE_OPERATIVO_SERVOMOTORES";
  if (!ok) throw new Error("Sin permiso");

  const amountMxn = Number(formData.get("amountMxn") ?? 0);
  const description = String(formData.get("description") ?? "").trim();
  const requiresCeo = amountMxn > 2000;
  const db = getDb();
  await db.insert(purchases).values({
    companyId: session.activeCompany.id,
    description,
    amountMxn,
    requiresCeoAuth: requiresCeo,
    status: requiresCeo ? "PENDIENTE_OC" : "REGISTRADA",
    createdByUserId: session.id,
  });
  revalidatePath("/app/compras");
}
