"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { findUserByUsername } from "@/lib/users";
import { createSession, destroySession, resolveDefaultCompanyId } from "@/lib/session";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    redirect("/login?error=credenciales");
  }

  const user = await findUserByUsername(username);
  if (!user || !user.active) {
    redirect("/login?error=credenciales");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    redirect("/login?error=credenciales");
  }

  const companyId = await resolveDefaultCompanyId(user.id);
  await createSession(user.id, companyId);
  redirect("/app");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
