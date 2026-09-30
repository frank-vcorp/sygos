import { and, asc, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import type { SessionUser } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/permissions-users";

export const VIEW_AS_COOKIE = "sygos_view_as";

export type ViewAsOption = {
  id: string;
  username: string;
  displayName: string;
  role: (typeof users.$inferSelect)["role"];
  roleLabel: string;
};

export function canUseViewAs(realSession: SessionUser) {
  return realSession.role === "ADMINISTRADOR";
}

export async function listViewAsTargets(): Promise<ViewAsOption[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
    })
    .from(users)
    .where(
      and(eq(users.active, true), ne(users.role, "ADMINISTRADOR"), ne(users.username, "Vectoria")),
    )
    .orderBy(asc(users.displayName));

  return rows.map((row) => ({
    ...row,
    roleLabel: ROLE_LABELS[row.role],
  }));
}

export async function readViewAsUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(VIEW_AS_COOKIE)?.value?.trim();
  return value || null;
}

export async function setViewAsUserId(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(VIEW_AS_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearViewAsUserId() {
  const cookieStore = await cookies();
  cookieStore.delete(VIEW_AS_COOKIE);
}

export async function validateViewAsTarget(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      active: users.active,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const row = rows[0];
  if (!row || !row.active) return null;
  if (row.role === "ADMINISTRADOR" || row.username === "Vectoria") return null;
  return row;
}
