"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearViewAsUserId,
  setViewAsUserId,
  validateViewAsTarget,
} from "@/lib/impersonation";
import { getRealSession, resolveDefaultCompanyId, switchActiveCompany } from "@/lib/session";
import { userCanAccessCompany } from "@/lib/users";

export async function setViewAsAction(userId: string) {
  const real = await getRealSession();
  if (!real || real.role !== "ADMINISTRADOR") throw new Error("Sin permiso");

  const target = await validateViewAsTarget(userId);
  if (!target) throw new Error("Usuario no permitido para Ver como");

  await setViewAsUserId(target.id);

  const canKeepCompany = await userCanAccessCompany(target.id, real.activeCompany.id);
  if (!canKeepCompany) {
    const companyId = await resolveDefaultCompanyId(target.id);
    await switchActiveCompany(target.id, companyId);
  }

  revalidatePath("/app", "layout");
  redirect("/app");
}

export async function clearViewAsAction() {
  const real = await getRealSession();
  if (!real || real.role !== "ADMINISTRADOR") throw new Error("Sin permiso");

  await clearViewAsUserId();
  revalidatePath("/app", "layout");
  redirect("/app");
}
