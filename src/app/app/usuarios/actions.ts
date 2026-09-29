"use server";

import bcrypt from "bcryptjs";
import { desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { companies, userCompanyAccess, users } from "@/db/schema";
import {
  MULTI_COMPANY_ROLES,
  canAssignRole,
  canManageOperationalUsers,
  canViewUserInList,
} from "@/lib/permissions-users";
import { getSession } from "@/lib/session";

const PROTECTED_USERNAME = "vectoria";

async function requireUserManager() {
  const session = await getSession();
  if (!session || !canManageOperationalUsers(session.role)) {
    throw new Error("Sin permiso");
  }
  return session;
}

export async function listManagedUsers() {
  const session = await requireUserManager();
  const db = getDb();
  const rows = await db.select().from(users).orderBy(desc(users.createdAt)).limit(500);
  return rows.filter((u) => canViewUserInList(u.role, session));
}

export async function listCompanies() {
  const db = getDb();
  return db.select().from(companies).where(eq(companies.active, true));
}

export async function createUserAction(formData: FormData) {
  const session = await requireUserManager();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const role = String(formData.get("role") ?? "") as (typeof users.$inferSelect)["role"];
  const password = String(formData.get("password") ?? "");
  const homeCode = String(formData.get("homeCompanyCode") ?? "") as "SYSTRON" | "SERVOMOTORES" | "";
  const maxDiscountRaw = String(formData.get("maxDiscountPercent") ?? "").trim();

  if (!username || !displayName || !password || password.length < 8) {
    throw new Error("Usuario, nombre y contraseña (mín. 8) requeridos");
  }
  if (!canAssignRole(session, role)) throw new Error("No puedes asignar ese rol");

  const db = getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = ${username}`)
    .limit(1);
  if (existing[0]) throw new Error("El usuario ya existe");

  let homeCompanyId: string | null = null;
  if (!MULTI_COMPANY_ROLES.has(role)) {
    if (!homeCode) throw new Error("Empresa home requerida para este rol");
    const co = await db.select().from(companies).where(eq(companies.code, homeCode)).limit(1);
    if (!co[0]) throw new Error("Empresa inválida");
    homeCompanyId = co[0].id;
  }

  let maxDiscountPercent: number | null = null;
  if (role === "VENTAS_SYSTRON" && maxDiscountRaw) {
    maxDiscountPercent = Math.min(100, Math.max(0, Number(maxDiscountRaw) || 0));
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [row] = await db
    .insert(users)
    .values({
      username,
      displayName,
      role,
      passwordHash,
      homeCompanyId,
      maxDiscountPercent,
    })
    .returning();

  if (MULTI_COMPANY_ROLES.has(role)) {
    const allCos = await db.select().from(companies).where(eq(companies.active, true));
    for (const c of allCos) {
      await db.insert(userCompanyAccess).values({ userId: row.id, companyId: c.id });
    }
  }

  revalidatePath("/app/usuarios");
}

export async function updateUserAction(formData: FormData) {
  const session = await requireUserManager();
  const id = String(formData.get("id") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const maxDiscountRaw = String(formData.get("maxDiscountPercent") ?? "").trim();
  if (!id || !displayName) throw new Error("Datos incompletos");

  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target || !canViewUserInList(target.role, session)) throw new Error("Usuario no encontrado");

  const maxDiscountPercent =
    target.role === "VENTAS_SYSTRON" && maxDiscountRaw
      ? Math.min(100, Math.max(0, Number(maxDiscountRaw) || 0))
      : target.maxDiscountPercent;

  await db
    .update(users)
    .set({
      displayName,
      maxDiscountPercent,
      updatedAt: sql`now()`,
    })
    .where(eq(users.id, id));

  revalidatePath("/app/usuarios");
}

export async function deactivateUserAction(formData: FormData) {
  const session = await requireUserManager();
  const id = String(formData.get("id") ?? "");
  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target || !canViewUserInList(target.role, session)) throw new Error("Usuario no encontrado");
  if (target.username.toLowerCase() === PROTECTED_USERNAME) {
    throw new Error("No se puede desactivar la cuenta nativa Vectoria");
  }
  await db.update(users).set({ active: false, updatedAt: sql`now()` }).where(eq(users.id, id));
  revalidatePath("/app/usuarios");
}
