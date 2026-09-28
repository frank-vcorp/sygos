"use server";

import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function changePasswordAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 10) {
    redirect("/app/cuenta?error=short");
  }
  if (next !== confirm) {
    redirect("/app/cuenta?error=mismatch");
  }

  const db = getDb();
  const row = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  const user = row[0];
  if (!user) redirect("/login");

  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) {
    redirect("/app/cuenta?error=current");
  }

  const passwordHash = await bcrypt.hash(next, 12);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: sql`now()` })
    .where(eq(users.id, session.id));

  redirect("/app/cuenta?ok=1");
}
